package azuredx

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/http/httputil"
	"os"
	"reflect"
	"strings"
	"time"

	"github.com/grafana/grafana_plugin_model/go/datasource"
)

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
			timeStamp, err := extractTimeStamp(row[timeColumnIdx])
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
// This done by having a query with make_series as the returned type.
// The time column must be named "Timestamp"
// Each Row has:
// - N Columns for group by items, where each Group by item is a column individual string column
// - An Array of Values per Aggregation Column
// - Timestamp column
func (tr *TableResponse) ToADXTimeSeries() ([]*datasource.TimeSeries, error) {
	seriesCollection := []*datasource.TimeSeries{}

	for _, resTable := range tr.Tables { // Foreach Table in Response
		if resTable.TableName != "Table_0" {
			continue
		}

		timeCount := 0
		timeColumnIdx := 0
		labelColumnIdxs := []int{} // idx to Label Name
		valueColumnIdxs := []int{}

		//TODO check len
		for colIdx, column := range resTable.Columns { // For column in the table
			switch column.ColumnType {
			case "string", "guid":
				labelColumnIdxs = append(labelColumnIdxs, colIdx)
			case "dynamic":
				if column.ColumnName == "Timestamp" {
					timeColumnIdx = colIdx
					timeCount++
					continue
				}
				valueColumnIdxs = append(valueColumnIdxs, colIdx)
			default:
				return nil, fmt.Errorf("unsupported type '%v' in response for a ADX time series query: must be object, guid, or string", column.ColumnType)
			}
		}

		if timeCount != 1 {
			return nil, fmt.Errorf("query must contain exactly one datetime column, got %v", timeCount)
		}

		var times []int64
		for rowIdx, row := range resTable.Rows {
			if rowIdx == 0 { // Time values are repeated for every row, so we only need to do this once
				interfaceSlice, ok := row[timeColumnIdx].([]interface{})
				if !ok {
					return nil, fmt.Errorf("time column was not of expected type, wanted []interface{} got %T", row[timeColumnIdx])
				}
				times = make([]int64, len(interfaceSlice))
				for i, interfaceVal := range interfaceSlice {
					var err error
					rawTimeStamp, ok := interfaceVal.(string)
					if !ok {
						return nil, fmt.Errorf("failed to extract timestamp want type string got type %T", interfaceVal)
					}
					times[i], err = extractTimeStamp(rawTimeStamp)
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
					return nil, fmt.Errorf("time column was not of expected type, wanted []interface{} got %T", row[valueIdx])
				}
				series := &datasource.TimeSeries{
					Name:   fmt.Sprintf("%v {%v}", resTable.Columns[valueIdx].ColumnName, labelsSB.String()),
					Points: make([]*datasource.Point, len(interfaceSlice)),
					Tags:   labels,
				}
				for idx, interfaceVal := range interfaceSlice {
					if interfaceIsNil(interfaceVal) {
						series.Points[idx] = &datasource.Point{
							Timestamp: times[idx],
							Value:     math.NaN(),
						}
						continue
					}
					val, ok := interfaceVal.(float64)
					if !ok {
						return nil, fmt.Errorf("series value was not of expected type, want float64 got type %T with value of %v", interfaceVal, interfaceVal)
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
	if interfaceIsNil(v) {
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
			return nil, fmt.Errorf("failed to marshal Object type into JSON string '%v': %v", v, err)
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

// extractTimeStamp extracts a Unix Timestamp in MS (suitable for the plugin) from an Azure Data Explorer Timestamp contained in an interface.
// The interface comes from within an ADX TableResponse. It is either the value of a record, or a within a
// dynamic record as in the case of a "series" response.
func extractTimeStamp(v interface{}) (i int64, err error) {
	nV, ok := v.(string)
	if !ok {
		return i, fmt.Errorf("expected interface of type string, got type '%T'", v)
	}
	t, err := time.Parse(time.RFC3339Nano, nV)
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

// interfaceIsNil is used to check if the interface value within a TableResponse is nil.
// https://stackoverflow.com/questions/13476349/check-for-nil-and-nil-interface-in-go
func interfaceIsNil(v interface{}) bool {
	return v == nil || (reflect.ValueOf(v).Kind() == reflect.Ptr && reflect.ValueOf(v).IsNil())
}

func tableFromJSON(rc io.Reader) (tr *TableResponse, err error) {
	tr = &TableResponse{}
	json.NewDecoder(rc).Decode(tr)
	if err != nil {
		return
	}
	return
}
