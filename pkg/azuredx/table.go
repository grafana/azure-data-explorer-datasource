package azuredx

import (
	"encoding/json"
	"fmt"
	"math"
	"reflect"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-model/go/datasource"
)

// TableResponse represents the response struct from Azure's Data Explorer REST API.
type TableResponse struct {
	Tables []Table
}

// Table is a member of TableResponse
type Table struct {
	TableName string
	Columns   []Column
	Rows      []Row
}

// Row Represents a row within a TableResponse
type Row []interface{}

// Column is a descriptor within a TableResponse
type Column struct {
	ColumnName string
	DataType   string
	ColumnType string
}

// ToTables turns a TableResponse into a slice of Tables appropriate for the plugin model.
func (tr *TableResponse) ToTables() ([]*datasource.Table, error) {
	tables := []*datasource.Table{}
	for _, resTable := range tr.Tables { // Foreach Table in Response
		if resTable.TableName != "Table_0" {
			continue
		}
		t := new(datasource.Table) // New API type table
		columnTypes := make([]string, len(resTable.Columns))

		t.Columns = make([]*datasource.TableColumn, len(resTable.Columns))

		for colIdx, column := range resTable.Columns { // For column in the table
			t.Columns[colIdx] = &datasource.TableColumn{Name: column.ColumnName}
			if column.ColumnType == "" && column.DataType != "" {
				switch column.DataType {
				case "String":
					columnTypes[colIdx] = kustoTypeString
					break
				case "Boolean":
					columnTypes[colIdx] = kustoTypeBool
					break
				case "Guid":
					columnTypes[colIdx] = kustoTypeGUID
					break
				case "DateTime":
					columnTypes[colIdx] = kustoTypeDatetime
					break
				case "Int":
					columnTypes[colIdx] = kustoTypeInt
					break
				case "Float":
					columnTypes[colIdx] = kustoTypeReal
					break
				case "Long":
				case "Decimal":
					columnTypes[colIdx] = kustoTypeLong
					break
				case "Dynamic":
					columnTypes[colIdx] = kustoTypeDynamic
					break
				}
			} else {
				columnTypes[colIdx] = column.ColumnType
			}

		}

		t.Rows = make([]*datasource.TableRow, len(resTable.Rows))

		for rowIdx, row := range resTable.Rows {
			newRow := &datasource.TableRow{Values: make([]*datasource.RowValue, len(t.Columns))}
			for recIdx, rec := range row {
				var err error
				newRow.Values[recIdx], err = extractValueForTable(rec, columnTypes[recIdx])
				if err != nil {
					return nil, err
				}
			}
			t.Rows[rowIdx] = newRow
		}
		tables = append(tables, t)

	}
	return tables, nil
}

// ToTimeSeries turns a TableResponse into a slice of Tables appropriate for the plugin model.
// Number Columns become a "Metric".
// String, or things that can become strings that are not a number become a Tags/Labels.
// There must be one and only one time column.
func (tr *TableResponse) ToTimeSeries() ([]*datasource.TimeSeries, bool, error) {
	series := []*datasource.TimeSeries{}
	timeNotASC := false

	for _, resTable := range tr.Tables { // Foreach Table in Response
		if resTable.TableName != "Table_0" {
			continue
		}

		seriesMap := make(map[string]map[string]*datasource.TimeSeries) // MetricName (Value Column) -> Tags -> Series

		timeCount := 0
		timeColumnIdx := 0
		labelColumnIdxs := []int{}
		valueColumnIdxs := []int{}

		for colIdx, column := range resTable.Columns { // For column in the table
			switch column.ColumnType {
			case kustoTypeDatetime:
				timeColumnIdx = colIdx
				timeCount++
			case kustoTypeInt, kustoTypeLong, kustoTypeReal:
				valueColumnIdxs = append(valueColumnIdxs, colIdx)
				seriesMap[column.ColumnName] = make(map[string]*datasource.TimeSeries)
			case kustoTypeString, kustoTypeGUID:
				labelColumnIdxs = append(labelColumnIdxs, colIdx)
			default:
				return nil, timeNotASC, fmt.Errorf("unsupported type '%v' in response for a time series query: must be datetime, int, long, real, guid, or string", column.ColumnType)
			}
		}

		if timeCount != 1 {
			return nil, timeNotASC, fmt.Errorf("expected exactly one column of type datetime in the response but got %v", timeCount)
		}
		if len(valueColumnIdxs) < 1 {
			return nil, timeNotASC, fmt.Errorf("did not find a value column, must provide one column of type int, long, or real")
		}

		var lastTimeStamp int64
		for rowIdx, row := range resTable.Rows {
			if len(row) != len(labelColumnIdxs)+len(valueColumnIdxs)+1 {
				return nil, timeNotASC, fmt.Errorf("unexpected number of rows in response")
			}
			timeStamp, err := extractTimeStamp(row[timeColumnIdx])
			if err != nil {
				return nil, timeNotASC, err
			}
			if rowIdx == 0 {
				lastTimeStamp = timeStamp
			} else if lastTimeStamp > timeStamp {
				timeNotASC = true
			}
			labels, err := labelMaker(resTable.Columns, row, labelColumnIdxs)
			if err != nil {
				return nil, false, err
			}
			for _, valueIdx := range valueColumnIdxs {
				colName := resTable.Columns[valueIdx].ColumnName
				// See if time Series exists- this is flawed as could confused values and labels, TODO do something better
				series, ok := seriesMap[colName][labels.str]
				if !ok {
					series = &datasource.TimeSeries{}
					series.Name = labels.GetName(colName)
					series.Tags = labels.keyVals
					seriesMap[colName][labels.str] = series
				}
				val, err := extractJSONNumberAsFloat(row[valueIdx])
				if err != nil {
					return nil, false, err
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

	return series, timeNotASC, nil
}

// ToADXTimeSeries returns Time series for a query that returns an ADX series type.
// This done by having a query with make_series as the returned type.
// The time column must be named "Timestamp".
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
			case kustoTypeString, kustoTypeGUID:
				labelColumnIdxs = append(labelColumnIdxs, colIdx)
			case kustoTypeDynamic:
				if column.ColumnName == "Timestamp" {
					timeColumnIdx = colIdx
					timeCount++
					continue
				}
				valueColumnIdxs = append(valueColumnIdxs, colIdx)
			default:
				return nil, fmt.Errorf("unsupported type '%v' in response for a ADX time series query: must be dynamic, guid, or string", column.ColumnType)
			}
		}

		if timeCount != 1 {
			return nil, fmt.Errorf("query must contain exactly one datetime column named 'Timestamp', got %v", timeCount)
		}
		if len(valueColumnIdxs) < 1 {
			return nil, fmt.Errorf("did not find a value column, expected at least one column of type 'dynamic', got %v", len(valueColumnIdxs))
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
					times[i], err = extractTimeStamp(interfaceVal)
					if err != nil {
						return nil, err
					}
				}
			}

			labels, err := labelMaker(resTable.Columns, row, labelColumnIdxs)
			if err != nil {
				return nil, err
			}
			for _, valueIdx := range valueColumnIdxs {
				// Handle case where all values are null
				if interfaceIsNil(row[valueIdx]) {
					series := &datasource.TimeSeries{
						Name:   labels.GetName(resTable.Columns[valueIdx].ColumnName),
						Points: make([]*datasource.Point, len(times)),
						Tags:   labels.keyVals,
					}
					for idx, time := range times {
						series.Points[idx] = &datasource.Point{Timestamp: time, Value: math.NaN()}
					}
					seriesCollection = append(seriesCollection, series)
					continue
				}

				interfaceSlice, ok := row[valueIdx].([]interface{})
				if !ok {
					return nil, fmt.Errorf("value column was not of expected type, wanted []interface{} got %T", row[valueIdx])
				}
				series := &datasource.TimeSeries{
					Name:   labels.GetName(resTable.Columns[valueIdx].ColumnName),
					Points: make([]*datasource.Point, len(interfaceSlice)),
					Tags:   labels.keyVals,
				}
				for idx, interfaceVal := range interfaceSlice {
					if interfaceIsNil(interfaceVal) {
						series.Points[idx] = &datasource.Point{
							Timestamp: times[idx],
							Value:     math.NaN(),
						}
						continue
					}
					val, err := extractJSONNumberAsFloat(interfaceVal)
					if err != nil {
						return nil, err
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

type rowLabels struct {
	keyVals map[string]string
	str     string
}

func (r *rowLabels) GetName(colName string) string {
	if len(r.keyVals) == 0 {
		return colName
	}

	//var names []string
	//for _, val := range r.keyVals {
	//	names = append(names, val)
	//}

	return fmt.Sprintf("{ \"%v\": {%v} }", colName, r.str)
	//return strings.Join(names, "|")
}

func labelMaker(columns []Column, row Row, labelColumnIdxs []int) (*rowLabels, error) {
	labels := new(rowLabels)

	var labelsSB strings.Builder
	labels.keyVals = make(map[string]string, len(labelColumnIdxs))
	for idx, labelIdx := range labelColumnIdxs { // gather labels
		val, ok := row[labelIdx].(string)
		if !ok {
			return nil, fmt.Errorf("failed to get string value for column %v", row[labelIdx])
		}
		colName := columns[labelIdx].ColumnName
		if _, err := labelsSB.WriteString(fmt.Sprintf("\"%v\":\"%v\"", colName, val)); err != nil {
			return nil, err
		}
		if len(labelColumnIdxs) > 1 && idx != len(labelColumnIdxs)-1 {
			if _, err := labelsSB.WriteString(", "); err != nil {
				return nil, err
			}
		}
		labels.keyVals[colName] = val
	}
	labels.str = labelsSB.String()
	return labels, nil
}

// extractValueForTable returns a RowValue suitable for the plugin model based on the ColumnType provided by the TableResponse's Columns.
// Available types as per the API are listed in "Scalar data types" https://docs.microsoft.com/en-us/azure/kusto/query/scalar-data-types/index.
// However, since we get this over JSON the underlying types are not always the type as declared by ColumnType.
func extractValueForTable(v interface{}, typ string) (*datasource.RowValue, error) {
	r := &datasource.RowValue{}
	var ok bool
	var err error
	if interfaceIsNil(v) {
		// It's okay if the string value is null sometimes.
		// Queries like .show databases will do this.
		r.Kind = datasource.RowValue_TYPE_NULL
		return r, nil
	}

	// Sometimes Kusto will not return a proper type, or an empty type.
	// In this case, try to interpolate the type.
	if typ == "" {
		switch v.(type) {
		case int:
			typ = kustoTypeInt
			break
		case float64:
			typ = kustoTypeReal
			break
		case string:
			typ = kustoTypeString
			break
		case json.Number:
			// For json.Number's we could have either a float or an int.
			// Numbers can be either float or int. If there is a "."
			// return float, otherwise return int.
			sv := fmt.Sprintf("%v", v)
			if strings.Contains(sv, ".") {
				typ = kustoTypeReal
			} else {
				typ = kustoTypeInt
			}
			break
		default:
			return nil, fmt.Errorf("unsupplied type '%v' in table for value '%v'", typ, v)
		}
	}

	switch typ {
	case kustoTypeBool:
		r.Kind = datasource.RowValue_TYPE_BOOL
		r.BoolValue, ok = v.(bool)
		if !ok {
			return nil, fmt.Errorf(extractFailFmt, v, "bool", typ, v)
		}
	case kustoTypeReal:
		r.Kind = datasource.RowValue_TYPE_DOUBLE
		r.DoubleValue, err = extractJSONNumberAsFloat(v)
		if err != nil {
			return nil, err
		}
	case kustoTypeInt, kustoTypeLong:
		r.Kind = datasource.RowValue_TYPE_INT64
		jN, ok := v.(json.Number)
		if !ok {
			return nil, fmt.Errorf(extractFailFmt, v, "json.Number", typ, v)
		}
		r.Int64Value, err = jN.Int64()
		if err != nil {
			return nil, fmt.Errorf("failed to extract int64 from json.Number: %v", err)
		}
	case kustoTypeDynamic:
		r.Kind = datasource.RowValue_TYPE_STRING
		b, err := json.Marshal(v)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal dynamic type into JSON string '%v': %v", v, err)
		}
		r.StringValue = string(b)
	case kustoTypeString, kustoTypeGUID, kustoTypeTimespan, kustoTypeDatetime:
		r.Kind = datasource.RowValue_TYPE_STRING
		r.StringValue, ok = v.(string)
		if !ok {
			return nil, fmt.Errorf(extractFailFmt, v, "string", typ, v)
		}
	default: // documented values not handled: decimal
		return nil, fmt.Errorf("unrecognized type '%v' in table for value '%v'", typ, v)
	}
	return r, nil
}

const extractFailFmt = "failed to extract value '%v' as a go of type %v, column type is %v and a go type of %T" // value, assertionType, columnType, value

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

// interfaceIsNil is used to check if the interface value within a TableResponse is nil.
// https://stackoverflow.com/questions/13476349/check-for-nil-and-nil-interface-in-go
func interfaceIsNil(v interface{}) bool {
	return v == nil || (reflect.ValueOf(v).Kind() == reflect.Ptr && reflect.ValueOf(v).IsNil())
}

func extractJSONNumberAsFloat(v interface{}) (f float64, err error) {
	jN, ok := v.(json.Number)
	if !ok {
		return float64(0), fmt.Errorf("expected json.Number but got type '%T' for '%v'", v, v)
	}
	return jN.Float64()
}

const (
	kustoTypeBool     = "bool"
	kustoTypeDatetime = "datetime"
	kustoTypeDynamic  = "dynamic"
	kustoTypeGUID     = "guid"
	kustoTypeInt      = "int"
	kustoTypeLong     = "long"
	kustoTypeReal     = "real"
	kustoTypeString   = "string"
	kustoTypeTimespan = "timespan"
	//kustoTypeDecimal  = "decimal"
)
