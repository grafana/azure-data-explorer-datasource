package azuredx

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/http/httputil"
	"os"
	"strings"
	"time"

	"golang.org/x/oauth2/microsoft"

	"github.com/grafana/grafana_plugin_model/go/datasource"
	"github.com/hashicorp/go-hclog"
	"golang.org/x/oauth2/clientcredentials"
)

// QueryModel contains the query information from the API call that we use.
type QueryModel struct {
	Format    string         `json:"format"`
	QueryType string         `json:"queryType"`
	Query     RequestPayload `json:"data"`
}

// DataSourceData holds the datasource configuration information.
type DataSourceData struct {
	ClientID        string `json:"clientId"`
	TenantID        string `json:"tenantId"`
	ClusterURL      string `json:"clusterUrl"`
	DefaultDatabase string `json:"defaultDatabase"`
	Secret          string `json:"-"`
}

// Client is an http.Client used for API requests.
type Client struct {
	*http.Client
	*DataSourceData
	Log hclog.Logger
}

// RequestPayload is the information that makes up a query for Azure's API.
type RequestPayload struct {
	DB         string `json:"db"`
	CSL        string `json:"csl"`
	Properties string `json:"properties"`
}

func newDataSourceData(dInfo *datasource.DatasourceInfo) (*DataSourceData, error) {
	d := DataSourceData{}
	err := json.Unmarshal([]byte(dInfo.GetJsonData()), &d)
	if err != nil {
		return nil, err
	}
	d.Secret = dInfo.GetDecryptedSecureJsonData()["clientSecret"]
	return &d, nil
}

// NewClient creates a new Azure Data Explorer http client from the DatasourceInfo.
// AAD OAuth authentication is setup for the client.
func NewClient(ctx context.Context, dInfo *datasource.DatasourceInfo, logger hclog.Logger) (*Client, error) {
	c := Client{}
	c.Log = logger
	var err error
	c.DataSourceData, err = newDataSourceData(dInfo)
	if err != nil {
		return nil, err
	}

	conf := clientcredentials.Config{
		ClientID:     c.ClientID,
		ClientSecret: c.Secret,
		TokenURL:     microsoft.AzureADEndpoint(c.TenantID).TokenURL,
		Scopes:       []string{"https://kusto.kusto.windows.net/.default"},
	}

	c.Client = conf.Client(ctx)
	return &c, nil
}

func (c *Client) TestRequest() error {
	var buf bytes.Buffer
	err := json.NewEncoder(&buf).Encode(RequestPayload{
		CSL: ".show databases schema",
		DB:  c.DefaultDatabase,
	})
	if err != nil {
		return err
	}

	resp, err := c.Post(c.ClusterURL+"/v1/rest/query", "application/json", &buf)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode > 299 {
		return fmt.Errorf("HTTP error: %v", resp.Status)
	}
	return nil
}

func (c *Client) TableRequest(payload RequestPayload) (*TableResponse, error) {
	var buf bytes.Buffer
	err := json.NewEncoder(&buf).Encode(payload)
	c.Log.Debug("Table Request Payload", fmt.Sprintf("%v", payload))
	if err != nil {
		return nil, err
	}

	resp, err := c.Post(c.ClusterURL+"/v1/rest/query", "application/json", &buf)
	if err != nil {
		return nil, err
	}
	err = dumpResponseToFile(resp, "/home/kbrandt/tmp/dumps.log") // TODO Remove
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode > 299 {
		bodyBytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Fatal(err)
		}
		bodyString := string(bodyBytes)
		return nil, fmt.Errorf("HTTP error: %v - %v", resp.Status, bodyString)
	}
	tr := &TableResponse{}
	json.NewDecoder(resp.Body).Decode(tr)
	if err != nil {
		return nil, err
	}
	return tr, nil
}

// TableResponse represents the response struct from Azure's Data Explorer REST API.
type TableResponse struct {
	Tables []struct {
		TableName string
		Columns   []struct {
			ColumnName string
			DataType   string
			ColumnType string
		}
		Rows [][]interface{}
	}
}

// ToTables turns a TableResponse into a slice of Tables appropriate for the plugin model.
func (tr *TableResponse) ToTables() ([]*datasource.Table, error) {
	tables := make([]*datasource.Table, len(tr.Tables))
	for tableIdx, resTable := range tr.Tables { // Foreach Table in Response
		t := new(datasource.Table) // New API type table
		columnTypes := make([]string, len(resTable.Columns))

		t.Columns = make([]*datasource.TableColumn, len(resTable.Columns))

		for colIdx, column := range resTable.Columns { // For column in the table
			t.Columns[colIdx] = &datasource.TableColumn{Name: column.ColumnName}
			columnTypes[colIdx] = column.ColumnType
		}

		t.Rows = make([]*datasource.TableRow, len(resTable.Rows))

		for rowIdx, row := range resTable.Rows {
			newRow := &datasource.TableRow{Values: make([]*datasource.RowValue, len(t.Columns))}
			for recIdx, rec := range row {
				var err error
				newRow.Values[recIdx], err = ExtractValue(rec, columnTypes[recIdx])
				if err != nil {
					return nil, err
				}
			}
			t.Rows[rowIdx] = newRow
		}
		tables[tableIdx] = t

	}
	return tables, nil
}

// ToTimeSeries turns a TableResponse into a slice of Tables appropriate for the plugin model.
// Number Columns become a "Metric"
// String, or things that can become strings that are not a number become a tag
// There must be one and only one time column
func (tr *TableResponse) ToTimeSeries() ([]*datasource.TimeSeries, error) {
	series := []*datasource.TimeSeries{}

	for _, resTable := range tr.Tables { // Foreach Table in Response

		if resTable.TableName != "Table_0" {
			continue
		}

		seriesMap := make(map[string]map[string]*datasource.TimeSeries) // MetricName (Value Column) -> Tags -> Series

		timeCount := 0
		timeColumnIdx := 0
		labelColumnIdxs := []int{} // idx to Label Name
		valueColumnIdxs := []int{}

		for colIdx, column := range resTable.Columns { // For column in the table
			switch column.ColumnType {
			case "datetime":
				timeColumnIdx = colIdx
				timeCount++
			case "int", "long", "real":
				valueColumnIdxs = append(valueColumnIdxs, colIdx)
				seriesMap[column.ColumnName] = make(map[string]*datasource.TimeSeries)
			case "string", "guid":
				labelColumnIdxs = append(labelColumnIdxs, colIdx)
			default:
				return nil, fmt.Errorf("unsupported type '%v' in response for a time series query: must be datetime, int, long, real, guid, or string", column.ColumnType)
			}
		}

		if timeCount != 1 {
			return nil, fmt.Errorf("did not find a column of type datetime in the response")
		}
		if len(valueColumnIdxs) < 1 {
			return nil, fmt.Errorf("did not find a value column, must provide one column of type int, long, or real")
		}

		for _, row := range resTable.Rows {
			if len(row) < len(labelColumnIdxs)+len(valueColumnIdxs)+1 {
				return nil, fmt.Errorf("unexpected number of rows in response")
			}
			timeStamp, err := ExtractTimeStamp(row[timeColumnIdx])
			if err != nil {
				return nil, err
			}
			var labelsSB strings.Builder // This is flawed as could confused values and labels, TODO do something better
			labels := make(map[string]string, len(labelColumnIdxs))
			for _, labelIdx := range labelColumnIdxs { // gather labels
				val, ok := row[labelIdx].(string)
				if !ok {
					return nil, fmt.Errorf("failed to get string value for column %v", row[labelIdx])
				}
				colName := resTable.Columns[labelIdx].ColumnName
				if _, err := labelsSB.WriteString(fmt.Sprintf("%v=%v ", colName, val)); err != nil {
					return nil, err
				}
				labels[colName] = val
			}
			for _, valueIdx := range valueColumnIdxs {
				// See if time Series exists
				colName := resTable.Columns[valueIdx].ColumnName
				series, ok := seriesMap[colName][labelsSB.String()]
				if !ok {
					series = &datasource.TimeSeries{}
					series.Name = fmt.Sprintf("%v {%v}", colName, labelsSB.String())
					series.Tags = labels
					seriesMap[colName][labelsSB.String()] = series
				}
				val, ok := row[valueIdx].(float64)
				if !ok {
					return nil, fmt.Errorf("failed to extract value from '%v' as float64 in '%v' column", row[valueIdx], colName)
				}
				series.Points = append(series.Points, &datasource.Point{Timestamp: timeStamp, Value: val})
			}
		}

		// Map Structure to Series
		for _, sm := range seriesMap {
			for _, s := range sm {
				series = append(series, s)
			}
		}

	}

	return series, nil
}

// ToADXTimeSeries returns Time series for a query that returns an ADX series type.
// This done by having a query with make_series as the returned type
//
// Each Row has:
// - N Columns for group by items, where each Group by item is a column individual string column
// - An Array of Values per Aggregation Column
// - The last column is whatever the timestamp is,
func (tr *TableResponse) ToADXTimeSeries() ([]*datasource.TimeSeries, error) {
	seriesCollection := []*datasource.TimeSeries{}

	for _, resTable := range tr.Tables { // Foreach Table in Response
		if resTable.TableName != "Table_0" {
			continue
		}

		labelColumnIdxs := []int{} // idx to Label Name
		valueColumnIdxs := []int{}

		//TODO check len
		for colIdx, column := range resTable.Columns[:len(resTable.Columns)-1] { // For column in the table
			switch column.ColumnType {
			case "string", "guid":
				labelColumnIdxs = append(labelColumnIdxs, colIdx)
			case "dynamic":
				valueColumnIdxs = append(valueColumnIdxs, colIdx)
			default:
				return nil, fmt.Errorf("unsupported type '%v' in response for a ADX time series query: must be object, guid, or string", column.ColumnType)
			}
		}

		var times []int64
		for rowIdx, row := range resTable.Rows {
			if rowIdx == 0 { // Time values are repeated for every row, so we only need to do this once
				interfaceSlice, ok := row[len(resTable.Columns)-1].([]interface{})
				if !ok {
					return nil, fmt.Errorf("time column was not of expected type, wanted []interface{} got %T", row[len(resTable.Columns)-1])
				}
				times = make([]int64, len(interfaceSlice))
				for i, interfaceVal := range interfaceSlice {
					var err error
					rawTimeStamp, ok := interfaceVal.(string)
					if !ok {
						return nil, fmt.Errorf("failed to extract timestamp want type string got type %T", interfaceVal)
					}
					times[i], err = ExtractTimeStamp(rawTimeStamp)
					if err != nil {
						return nil, fmt.Errorf("failed to parse timestamp with raw value of %v", rawTimeStamp)
					}
				}
			}

			var labelsSB strings.Builder // This is flawed as could confused values and labels, TODO do something better
			labels := make(map[string]string, len(labelColumnIdxs))
			for _, labelIdx := range labelColumnIdxs { // gather labels
				val, ok := row[labelIdx].(string)
				if !ok {
					return nil, fmt.Errorf("failed to get string value for column %v", row[labelIdx])
				}
				colName := resTable.Columns[labelIdx].ColumnName
				if _, err := labelsSB.WriteString(fmt.Sprintf("%v=%v ", colName, val)); err != nil {
					return nil, err
				}
				labels[colName] = val
			}

			for _, valueIdx := range valueColumnIdxs {
				interfaceSlice, ok := row[valueIdx].([]interface{})
				if !ok {
					return nil, fmt.Errorf("time column was not of expected type, wanted []interface{} got %T", row[len(resTable.Columns)-1])
				}
				series := &datasource.TimeSeries{
					Name:   fmt.Sprintf("%v {%v}", resTable.Columns[valueIdx].ColumnName, labelsSB.String()),
					Points: make([]*datasource.Point, len(interfaceSlice)),
					Tags:   labels,
				}
				for idx, interfaceVal := range interfaceSlice {
					val, ok := interfaceVal.(float64)
					if !ok {
						return nil, fmt.Errorf("series value was not of expected type, want float64 got type %T", interfaceVal)
					}
					series.Points[idx] = &datasource.Point{
						Timestamp: times[idx],
						Value:     val,
					}
				}

				seriesCollection = append(seriesCollection, series)
			}

		}

	}

	return seriesCollection, nil
}

// ExtractValue returns a RowValue suitable for the plugin model based on the ColumnType provided by the TableResponse's Columns.
// Available types as per the API are listed in "Scalar data types" https://docs.microsoft.com/en-us/azure/kusto/query/scalar-data-types/index.
// However, since we get this over JSON the underlying types are not always the type as declared by ColumnType.
func ExtractValue(v interface{}, typ string) (*datasource.RowValue, error) {
	r := &datasource.RowValue{}
	var ok bool
	if fmt.Sprintf("%v", v) == "<nil>" {
		r.Kind = datasource.RowValue_TYPE_NULL
		return r, nil
	}
	switch typ {
	case "bool":
		r.Kind = datasource.RowValue_TYPE_BOOL
		r.BoolValue, ok = v.(bool)
		if !ok {
			return nil, fmt.Errorf("failed to extract %v '%v' type is %T", typ, v, v)
		}
	case "int", "long", "real":
		r.Kind = datasource.RowValue_TYPE_DOUBLE
		r.DoubleValue, ok = v.(float64)
		if !ok {
			return nil, fmt.Errorf("failed to extract %v '%v' type is %T", typ, v, v)
		}
	case "dynamic":
		r.Kind = datasource.RowValue_TYPE_STRING
		b, err := json.Marshal(v)
		if err != nil {
			return nil, fmt.Errorf("failed to marshall Object type into JSON string '%v': %v", v, err)
		}
		r.StringValue = string(b)
	case "string", "guid", "timespan", "datetime", "":
		r.Kind = datasource.RowValue_TYPE_STRING
		r.StringValue, ok = v.(string)
		if !ok {
			return nil, fmt.Errorf("failed to extract int/long '%v'", v)
		}
	default: // documented values not handled: decimal
		return nil, fmt.Errorf("unrecognized type '%v' in table for value '%v'", typ, v)
	}
	return r, nil
}

func ExtractTimeStamp(v interface{}) (i int64, err error) {
	nV, ok := v.(string)
	if !ok {
		return i, fmt.Errorf("expected interface of type string, got type '%T'", v)
	}
	t, err := time.Parse("2006-01-02T15:04:05.999999Z", nV)
	if err != nil {
		return i, fmt.Errorf("failed to parse time for '%v'", nV)
	}
	return t.UnixNano() / 1e6, nil
}

// TODO Temporary
func dumpResponseToFile(resp *http.Response, filename string) error {
	dump, err := httputil.DumpResponse(resp, true)
	if err != nil {
		return err
	}
	f, err := os.OpenFile(filename, os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}

	defer f.Close()

	if _, err = f.Write(dump); err != nil {
		return err
	}
	return nil
}
