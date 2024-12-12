package models

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"regexp"
	"sort"
	"strconv"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/errorsource"
	jsoniter "github.com/json-iterator/go"
)

// TableResponse represents the response struct from Azure's Data Explorer REST API.
type TableResponse struct {
	Tables     []Table
	Exceptions []string
}

// Table is a member of TableResponse
type Table struct {
	TableName string
	Columns   []Column
	Rows      []Row
}

// Row Represents a row within a TableResponse
type Row interface{}

// Column is a descriptor within a TableResponse
type Column struct {
	ColumnName string
	DataType   string
	ColumnType string
}

func (ar *TableResponse) getTableByName(name string) (Table, error) {
	for _, t := range ar.Tables {
		if t.TableName == name {
			return t, nil
		}
	}
	return Table{}, fmt.Errorf("no data as %v table is missing from the the response", name)
}

func (tr *TableResponse) ToDataFrames(executedQueryString string, format string) (data.Frames, error) {
	table, err := tr.getTableByName("Table_0")
	if err != nil {
		return nil, err
	}
	if len(table.Rows) == 0 {
		return data.Frames{}, nil
	}
	converterFrame, err := converterFrameForTable(table, executedQueryString, format)
	if err != nil {
		return nil, err
	}
	for rowIdx, row := range table.Rows {
		rows, ok := row.([]interface{})
		if !ok {
			return nil, fmt.Errorf("unable to parse rows: %v", row)
		}
		for fieldIdx, field := range rows {
			err = converterFrame.Set(fieldIdx, rowIdx, field)
			if err != nil {
				return nil, err
			}
		}
	}
	return data.Frames{converterFrame.Frame}, nil
}

func converterFrameForTable(t Table, executedQueryString string, format string) (*data.FrameInputConverter, error) {
	converters := []data.FieldConverter{}
	colNames := make([]string, len(t.Columns))
	colTypes := make([]string, len(t.Columns))

	for i, col := range t.Columns {
		colNames[i] = col.ColumnName
		colTypes[i] = col.ColumnType
		converter, ok := converterMap[col.ColumnType]
		if format == "trace" {
			if col.ColumnName == "serviceTags" || col.ColumnName == "tags" {
				converter = tagsConverter
			} else if col.ColumnName == "logs" {
				converter = logsConverter
			}
		}
		if !ok {
			return nil, fmt.Errorf("unsupported analytics column type %v", col.ColumnType)
		}
		converters = append(converters, converter)
	}

	fic, err := data.NewFrameInputConverter(converters, len(t.Rows))
	if err != nil {
		return nil, err
	}

	err = fic.Frame.SetFieldNames(colNames...)
	if err != nil {
		return nil, err
	}

	fic.Frame.Meta = &data.FrameMeta{
		ExecutedQueryString: executedQueryString,
		Custom:              AzureFrameMD{ColumnTypes: colTypes},
	}

	if format == "trace" {
		fic.Frame.Meta.PreferredVisualization = data.VisTypeTrace
	}

	if format == "logs" {
		fic.Frame.SetMeta(&data.FrameMeta{
			PreferredVisualization: data.VisTypeLogs,
			Custom: map[string]any{
				"ColumnTypes": colTypes,
				"searchWords": getSearchWords(executedQueryString),
			},
		})
	}

	return fic, nil
}

// Finds search words in 'where' clauses that are formatted like "| where Level == 'Info' or Level == 'Debug'"
// Only returns string values. In this example ["Info", "Debug"] will be returned.
func getSearchWords(query string) []string {
	const maxFinds = 100
	whereRegExp := regexp.MustCompile(`\| where [a-zA-Z]+ == '.*'`)
	whereLines := whereRegExp.FindAllString(query, maxFinds)
	stringRegExp := regexp.MustCompile("'(.*?)'")
	words := []string{}
	for _, v := range whereLines {
		phrases := stringRegExp.FindAllString(v, maxFinds)
		if phrases == nil {
			continue
		}
		// remove quotes around strings
		for _, v2 := range phrases {
			words = append(words, v2[1:len(v2)-1])
		}
	}
	return words
}

var converterMap = map[string]data.FieldConverter{
	"string":   stringConverter,
	"guid":     stringConverter,
	"timespan": stringConverter,
	"dynamic":  dynamicConverter,
	"datetime": timeConverter,
	"int":      intConverter,
	"long":     longConverter,
	"real":     realConverter,
	"bool":     boolConverter,
	"decimal":  decimalConverter,
}

var dynamicConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeString,
	Converter: func(v interface{}) (interface{}, error) {
		b, err := jsoniter.Marshal(v)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal dynamic type into JSON string '%v': %v", v, err)
		}
		return string(b), nil
	},
}

var stringConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableString,
	Converter: func(v interface{}) (interface{}, error) {
		var as *string
		if v == nil {
			return as, nil
		}
		s, ok := v.(string)
		if !ok {
			return nil, fmt.Errorf("unexpected type, expected string but got type %T with a value of %v", v, v)
		}
		as = &s
		return as, nil
	},
}

var timeConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableTime,
	Converter: func(v interface{}) (interface{}, error) {
		var at *time.Time
		if v == nil {
			return at, nil
		}
		s, ok := v.(string)
		if !ok {
			return nil, fmt.Errorf("unexpected type, expected string but got type %T with a value of %v", v, v)
		}
		t, err := time.Parse(time.RFC3339Nano, s)
		if err != nil {
			return nil, err
		}

		return &t, nil
	},
}

var realConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableFloat64,
	Converter: func(v interface{}) (interface{}, error) {
		var af *float64
		if v == nil {
			return af, nil
		}
		jN, ok := v.(json.Number)
		if !ok {
			s, sOk := v.(string)
			if sOk {
				switch s {
				case "Infinity":
					f := math.Inf(0)
					return &f, nil
				case "-Infinity":
					f := math.Inf(-1)
					return &f, nil
				case "NaN":
					f := math.NaN()
					return &f, nil
				}
			}
			return nil, fmt.Errorf("unexpected type, expected json.Number but got type %T for value %v", v, v)
		}
		f, err := jN.Float64()
		if err != nil {
			return nil, err
		}
		return &f, err
	},
}

var boolConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableBool,
	Converter: func(v interface{}) (interface{}, error) {
		var ab *bool
		if v == nil {
			return ab, nil
		}
		b, ok := v.(bool)
		if ok {
			return &b, nil
		}
		i, ok := v.(json.Number)
		if ok {
			b = i != "0"
			return &b, nil
		}
		return nil, fmt.Errorf("unexpected type, expected bool or json.Number but got type %T with a value of %v", v, v)
	},
}

var intConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableInt32,
	Converter: func(v interface{}) (interface{}, error) {
		var ai *int32
		if v == nil {
			return ai, nil
		}
		jN, ok := v.(json.Number)
		if !ok {
			return nil, fmt.Errorf("unexpected type, expected json.Number but got type %T with a value of %v", v, v)
		}
		var err error
		iv, err := strconv.ParseInt(jN.String(), 10, 32)
		if err != nil {
			return nil, err
		}
		aInt := int32(iv)
		return &aInt, nil
	},
}

var longConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableInt64,
	Converter: func(v interface{}) (interface{}, error) {
		var ai *int64
		if v == nil {
			return ai, nil
		}
		jN, ok := v.(json.Number)
		if !ok {
			return nil, fmt.Errorf("unexpected type, expected json.Number but got type %T with a value of %v", v, v)
		}
		out, err := jN.Int64()
		if err != nil {
			return nil, err
		}
		return &out, err
	},
}

var decimalConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableFloat64,
	Converter: func(v interface{}) (interface{}, error) {
		var af *float64
		if v == nil {
			return af, nil
		}

		jS, sOk := v.(string)
		if sOk {
			out, err := strconv.ParseFloat(jS, 64)
			if err != nil {
				return nil, err
			}
			return &out, err
		}

		jN, nOk := v.(json.Number)
		if !nOk {
			return nil, fmt.Errorf("unexpected type, expected json.Number or string but got type %T with a value of %v", v, v)
		}
		out, err := jN.Float64()
		if err != nil {
			return nil, err
		}
		return &out, nil
	},
}

type KeyValue struct {
	Value interface{} `json:"value"`
	Key   string      `json:"key"`
}

func parseKeyValue(m map[string]any) []KeyValue {
	parsedTags := []KeyValue{}
	for k, v := range m {
		if v == nil {
			continue
		}

		switch v.(type) {
		case float64:
			if v == 0 {
				continue
			}
		case string:
			if v == "" {
				continue
			}
		}

		parsedTags = append(parsedTags, KeyValue{Key: k, Value: v})
	}
	sort.Slice(parsedTags, func(i, j int) bool {
		return parsedTags[i].Key < parsedTags[j].Key
	})

	return parsedTags
}

var tagsConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableJSON,
	Converter: func(v interface{}) (interface{}, error) {
		if v == nil {
			return nil, nil
		}

		m, ok := v.(map[string]any)
		if !ok {
			err := json.Unmarshal([]byte(v.(string)), &m)
			if err != nil {
				return nil, fmt.Errorf("failed to unmarshal trace tags: %s", err)
			}
		}

		parsedTags := parseKeyValue(m)

		marshalledTags, err := json.Marshal(parsedTags)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal parsed trace tags: %s", err)
		}

		jsonTags := json.RawMessage(marshalledTags)

		return &jsonTags, nil
	},
}

type TraceLog struct {
	Timestamp int64      `json:"timestamp"`
	Fields    []KeyValue `json:"fields"`
}

var logsConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableJSON,
	Converter: func(v interface{}) (interface{}, error) {
		if v == nil {
			return nil, nil
		}

		m, ok := v.([]any)
		if !ok {
			err := json.Unmarshal([]byte(v.(string)), &m)
			if err != nil {
				return nil, fmt.Errorf("failed to unmarshal trace logs: %s", err)
			}
		}

		parsedLogs := []TraceLog{}
		for i := range m {
			current, ok := m[i].(map[string]any)
			if !ok {
				err := json.Unmarshal([]byte(v.(string)), &m)
				if err != nil {
					return nil, fmt.Errorf("failed to unmarshal trace log: %s", err)
				}
			}
			timestamp, err := current["timestamp"].(json.Number).Int64()
			if err != nil {
				return nil, fmt.Errorf("failed to unmarshal trace log: %s", err)
			}
			fields, ok := current["fields"].(map[string]any)
			if !ok {
				return nil, fmt.Errorf("failed to unmarshal trace log: %s", err)
			}
			traceLog := TraceLog{
				Timestamp: timestamp,
				Fields:    parseKeyValue(fields),
			}

			parsedLogs = append(parsedLogs, traceLog)
		}

		marshalledLogs, err := json.Marshal(parsedLogs)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal parsed trace logs: %s", err)
		}

		jsonTags := json.RawMessage(marshalledLogs)

		return &jsonTags, nil
	},
}

// ToADXTimeSeries returns Time series for a query that returns an ADX series type.
// This done by having a query with make_series as the returned type.
// The time column must be named "Timestamp".
// Each Row has:
// - N Columns for group by items, where each Group by item is a column individual string column
// - An Array of Values per Aggregation Column
// - Timestamp column
//
// From the ADX documentation, I believe all series will share the same time index,
// so we create a wide frame.
func ToADXTimeSeries(in *data.Frame) (*data.Frame, error) {
	if in.Rows() == 0 {
		return in, nil
	}

	timeColIdx := -1
	labelColIdxs := []int{}
	valueColIdxs := []int{}

	// TODO check to avoid panics
	getKustoColType := func(fIdx int) string {
		return in.Meta.Custom.(AzureFrameMD).ColumnTypes[fIdx]
	}

	foundTime := false
	for fieldIdx, field := range in.Fields {
		switch getKustoColType(fieldIdx) {
		case "string":
			labelColIdxs = append(labelColIdxs, fieldIdx)
		case "dynamic":
			if field.Name == "Timestamp" {
				if foundTime {
					return nil, fmt.Errorf("must be exactly one column named 'Timestamp', but response has more than one")
				}
				foundTime = true
				timeColIdx = fieldIdx
				continue
			}
			valueColIdxs = append(valueColIdxs, fieldIdx)

		}
	}

	if timeColIdx == -1 {
		return nil, fmt.Errorf("response must have a column named 'Timestamp'")
	}
	if len(valueColIdxs) < 1 {
		return nil, fmt.Errorf("did not find a numeric value column, expected at least one column of type 'dynamic', got %v", len(valueColIdxs))
	}

	out := data.NewFrame(in.Name).SetMeta(&data.FrameMeta{ExecutedQueryString: in.Meta.ExecutedQueryString})

	// Each row is a series
	expectedRowLen := 0
	for rowIdx := 0; rowIdx < in.Rows(); rowIdx++ {
		// Set up the shared time index
		if rowIdx == 0 {
			rawTimeArrayString := in.At(timeColIdx, 0).(string)
			times := []time.Time{}
			err := jsoniter.Unmarshal([]byte(rawTimeArrayString), &times)
			if err != nil {
				return nil, err
			}
			expectedRowLen = len(times)
			out.Fields = append(out.Fields, data.NewField("Timestamp", nil, times))
		}

		// Build the labels for the series from the row
		var l data.Labels
		for i, labelIdx := range labelColIdxs {
			if i == 0 {
				l = make(data.Labels)
			}
			labelVal, _ := in.ConcreteAt(labelIdx, rowIdx)
			l[in.Fields[labelIdx].Name] = labelVal.(string)
		}

		for _, valueIdx := range valueColIdxs {
			// Will treat all numeric values as nullable floats here
			vals := []*float64{}
			rawValues := in.At(valueIdx, rowIdx).(string)
			err := jsoniter.Unmarshal([]byte(rawValues), &vals)
			if err != nil {
				return nil, err
			}
			if len(vals) == 0 {
				// When all the values are null, the object is null in the response.
				// Must set to length of frame for a consistent length frame
				vals = make([]*float64, expectedRowLen)
			}
			out.Fields = append(out.Fields, data.NewField(in.Fields[valueIdx].Name, l, vals))
		}

	}

	return out, nil
}

func TableFromJSON(rc io.Reader) (*TableResponse, error) {
	tr := &TableResponse{}
	decoder := jsoniter.NewDecoder(rc)
	// Numbers as string (json.Number) so we can keep types as best we can (since the response has 'type' of column)
	decoder.UseNumber()
	err := decoder.Decode(tr)
	if err != nil {
		return nil, err
	}
	if len(tr.Tables) == 0 {
		return nil, fmt.Errorf("unable to parse response, parsed response has no tables")
	}

	if len(tr.Exceptions) > 0 {
		errMsg := ""
		for _, e := range tr.Exceptions {
			errMsg += e + ". "
		}
		return nil, errorsource.DownstreamError(errors.New(errMsg), false)
	}

	return tr, nil
}
