package azuredx

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

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
			if column.ColumnType == "" {
				return nil, fmt.Errorf("column is missing type, has name of '%v', type '%v', datatype '%v'", column.ColumnName, column.ColumnType, column.DataType)
			}
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
	// case "datetime":
	// 	r.Kind = datasource.RowValue_TYPE_INT64
	// 	nV, ok := v.(string)
	// 	if !ok {
	// 		return nil, fmt.Errorf("failed to extract datetime as string '%v' ", v)
	// 	}
	// 	t, err := time.Parse(time.RFC3339Nano, nV)
	// 	if err != nil {
	// 		return nil, fmt.Errorf("failed to extract time for '%v'", nV)
	// 	}
	// 	r.Int64Value = t.UnixNano()
	case "string", "guid", "timespan", "datetime":
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
