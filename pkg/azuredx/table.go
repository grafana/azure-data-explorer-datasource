package azuredx

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
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

func (tr *TableResponse) ToDataFrames(refID string, customMD map[string]interface{}) ([]*data.Frame, error) {
	frames := make([]*data.Frame, 1)
	for _, table := range tr.Tables {
		if table.TableName != "Table_0" {
			continue
		}
		frame, err := table.ToDataFrame()
		if err != nil {
			return nil, err
		}
		frame.RefID = refID
		if customMD != nil {
			frame.Meta = &data.FrameMeta{
				Custom: customMD,
			}
		}
		frames[0] = frame
	}

	return frames, nil
}

func (t *Table) ToDataFrame() (*data.Frame, error) {
	frame, converters, err := emptyFrameForTable(t)
	if err != nil {
		return nil, err
	}
	for rowIdx, row := range t.Rows {
		for colIdx, cell := range row {
			v, err := converters[colIdx](cell)
			if err != nil {
				return nil, err
			}
			frame.Set(colIdx, rowIdx, v)
		}
	}
	return frame, nil
}

func emptyFrameForTable(t *Table) (*data.Frame, []converter, error) {
	fields := make([]*data.Field, len(t.Columns))
	rowLen := len(t.Rows)

	converters := make([]converter, len(t.Columns))

	for i, col := range t.Columns {
		fType, ok := fieldTypeForKustoType(col.ColumnType)
		if !ok {
			// TODO maybe remove this error
			return nil, nil, fmt.Errorf("unsupported kusto column type %v", col.ColumnType)
		}
		converters[i] = converterForKustoType(col.ColumnType)
		field := data.NewFieldFromFieldType(fType, rowLen)
		field.Name = col.ColumnName
		fields[i] = field
	}
	return data.NewFrame(t.TableName, fields...), converters, nil
}

// return data Field type for kustoType, if no match, will return assume nullabe string vector and return false.
func fieldTypeForKustoType(kustoType string) (data.FieldType, bool) {
	d := data.FieldTypeNullableString
	switch strings.ToLower(kustoType) {
	case "string", "guid", "timespan", "dynamic":
		d = data.FieldTypeNullableString
	case "bool":
		d = data.FieldTypeNullableBool
	case "int":
		d = data.FieldTypeNullableInt32
	case "long":
		d = data.FieldTypeNullableInt64
	case "real":
		d = data.FieldTypeNullableFloat64
	case "datetime":
		d = data.FieldTypeNullableTime
	default:
		return d, false
	}
	return d, true
}

func converterForKustoType(kustoType string) converter {
	var converter converter
	switch strings.ToLower(kustoType) {
	case "string", "guid", "timespan":
		converter = stringConverter
	case "bool":
		converter = boolConverter
	case "int":
		converter = intConverter
	case "long":
		converter = longConverter
	case "real":
		converter = realConverter
	case "datetime":
		converter = timeConverter
	case "dynamic":
		converter = dynamicConverter
	default:
		converter = noConverter
	}
	return converter
}

type converter func(v interface{}) (interface{}, error)

func longConverter(v interface{}) (interface{}, error) {
	var ai *int64
	if v == nil {
		return ai, nil
	}
	jN, ok := v.(json.Number)
	if !ok {
		return nil, fmt.Errorf("unexpected type, expected json.Number got %T", v)
	}
	out, err := jN.Int64()
	if err != nil {
		return nil, err
	}
	return &out, err
}

func realConverter(v interface{}) (interface{}, error) {
	var af *float64
	if v == nil {
		return af, nil
	}
	jN, ok := v.(json.Number)
	if !ok {
		return nil, fmt.Errorf("unexpected type, expected json.Number got %T", v)
	}
	f, err := jN.Float64()
	if err != nil {
		return nil, err
	}
	return &f, err
}

func intConverter(v interface{}) (interface{}, error) {
	var ai *int32
	if v == nil {
		return ai, nil
	}
	jN, ok := v.(json.Number)
	if !ok {
		return nil, fmt.Errorf("unexpected type, expected json.Number got %T", v)
	}
	var err error
	iv, err := strconv.ParseInt(jN.String(), 10, 32)
	if err != nil {
		return nil, err
	}
	aInt := int32(iv)
	return &aInt, nil
}

func noConverter(v interface{}) (interface{}, error) {
	return v, nil
}

func stringConverter(v interface{}) (interface{}, error) {
	var as *string
	if v == nil {
		return as, nil
	}
	s, ok := v.(string)
	if !ok {
		return nil, fmt.Errorf("unexpected type, expected string got %T", v)
	}
	return &s, nil
}

func boolConverter(v interface{}) (interface{}, error) {
	var ab *bool
	if v == nil {
		return ab, nil
	}
	b, ok := v.(bool)
	if !ok {
		return nil, fmt.Errorf("unexpected type, expected bool got %T", v)
	}
	return &b, nil
}

func timeConverter(v interface{}) (interface{}, error) {
	var at *time.Time
	if v == nil {
		return at, nil
	}
	s, ok := v.(string)
	if !ok {
		return nil, fmt.Errorf("unexpected type, expected string got %T", v)
	}
	t, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		return nil, err
	}

	return &t, nil
}

func dynamicConverter(v interface{}) (interface{}, error) {
	var as *string
	if v == nil {
		return as, nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal dynamic type into JSON string '%v': %v", v, err)
	}
	s := string(b)
	return &s, nil
}

// ToADXTimeSeries returns Time series for a query that returns an ADX series type.
// This done by having a query with make_series as the returned type.
// The time column must be named "Timestamp".
// Each Row has:
// - N Columns for group by items, where each Group by item is a column individual string column
// - An Array of Values per Aggregation Column
// - Timestamp column
// func (tr *TableResponse) ToADXTimeSeries() ([]*datasource.TimeSeries, error) {
// 	seriesCollection := []*datasource.TimeSeries{}
// 	for _, resTable := range tr.Tables { // Foreach Table in Response
// 		if resTable.TableName != "Table_0" {
// 			continue
// 		}

// 		timeCount := 0
// 		timeColumnIdx := 0
// 		labelColumnIdxs := []int{} // idx to Label Name
// 		valueColumnIdxs := []int{}

// 		//TODO check len
// 		for colIdx, column := range resTable.Columns { // For column in the table
// 			switch column.ColumnType {
// 			case kustoTypeString, kustoTypeGUID:
// 				labelColumnIdxs = append(labelColumnIdxs, colIdx)
// 			case kustoTypeDynamic:
// 				if column.ColumnName == "Timestamp" {
// 					timeColumnIdx = colIdx
// 					timeCount++
// 					continue
// 				}
// 				valueColumnIdxs = append(valueColumnIdxs, colIdx)
// 			default:
// 				return nil, fmt.Errorf("unsupported type '%v' in response for a ADX time series query: must be dynamic, guid, or string", column.ColumnType)
// 			}
// 		}

// 		if timeCount != 1 {
// 			return nil, fmt.Errorf("query must contain exactly one datetime column named 'Timestamp', got %v", timeCount)
// 		}
// 		if len(valueColumnIdxs) < 1 {
// 			return nil, fmt.Errorf("did not find a value column, expected at least one column of type 'dynamic', got %v", len(valueColumnIdxs))
// 		}

// 		var times []int64
// 		for rowIdx, row := range resTable.Rows {
// 			if rowIdx == 0 { // Time values are repeated for every row, so we only need to do this once
// 				interfaceSlice, ok := row[timeColumnIdx].([]interface{})
// 				if !ok {
// 					return nil, fmt.Errorf("time column was not of expected type, wanted []interface{} got %T", row[timeColumnIdx])
// 				}
// 				times = make([]int64, len(interfaceSlice))
// 				for i, interfaceVal := range interfaceSlice {
// 					var err error
// 					times[i], err = extractTimeStamp(interfaceVal)
// 					if err != nil {
// 						return nil, err
// 					}
// 				}
// 			}

// 			labels, err := labelMaker(resTable.Columns, row, labelColumnIdxs)
// 			if err != nil {
// 				return nil, err
// 			}
// 			for _, valueIdx := range valueColumnIdxs {
// 				// Handle case where all values are null
// 				if interfaceIsNil(row[valueIdx]) {
// 					series := &datasource.TimeSeries{
// 						Name:   labels.GetName(resTable.Columns[valueIdx].ColumnName),
// 						Points: make([]*datasource.Point, len(times)),
// 						Tags:   labels.keyVals,
// 					}
// 					for idx, time := range times {
// 						series.Points[idx] = &datasource.Point{Timestamp: time, Value: math.NaN()}
// 					}
// 					seriesCollection = append(seriesCollection, series)
// 					continue
// 				}

// 				interfaceSlice, ok := row[valueIdx].([]interface{})
// 				if !ok {
// 					return nil, fmt.Errorf("value column was not of expected type, wanted []interface{} got %T", row[valueIdx])
// 				}
// 				series := &datasource.TimeSeries{
// 					Name:   labels.GetName(resTable.Columns[valueIdx].ColumnName),
// 					Points: make([]*datasource.Point, len(interfaceSlice)),
// 					Tags:   labels.keyVals,
// 				}
// 				for idx, interfaceVal := range interfaceSlice {
// 					if interfaceIsNil(interfaceVal) {
// 						series.Points[idx] = &datasource.Point{
// 							Timestamp: times[idx],
// 							Value:     math.NaN(),
// 						}
// 						continue
// 					}
// 					val, err := extractJSONNumberAsFloat(interfaceVal)
// 					if err != nil {
// 						return nil, err
// 					}
// 					series.Points[idx] = &datasource.Point{
// 						Timestamp: times[idx],
// 						Value:     val,
// 					}
// 				}
// 				seriesCollection = append(seriesCollection, series)
// 			}
// 		}
// 	}
// 	return seriesCollection, nil
// }
