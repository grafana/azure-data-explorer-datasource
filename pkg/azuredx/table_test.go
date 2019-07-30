package azuredx

import (
	"encoding/json"
	"os"
	"path"
	"testing"

	"github.com/grafana/grafana_plugin_model/go/datasource"
	"github.com/stretchr/testify/assert"
)

func Test_extractTimeStamp(t *testing.T) {
	tests := []struct {
		name      string
		arg       interface{}
		errorIs   assert.ErrorAssertionFunc
		returnIs  assert.ComparisonAssertionFunc
		returnVal int64
	}{
		{
			name:      "non-string arg should error",
			arg:       12,
			errorIs:   assert.Error,
			returnIs:  assert.Equal,
			returnVal: 0,
		},
		{
			name:      "golang reference time should become unix ts value in ms",
			arg:       "2006-01-02T22:04:05.00Z",
			errorIs:   assert.NoError,
			returnIs:  assert.Equal,
			returnVal: 1136239445000,
		},
		{
			name:      "should be non-destructive to millisecond resolution",
			arg:       "2006-01-02T22:04:05.1Z",
			errorIs:   assert.NoError,
			returnIs:  assert.Equal,
			returnVal: 1136239445100,
		},
		{
			name:      "will be destructive (truncation) to nanoseconds resolution but will not error",
			arg:       "2006-01-02T22:04:05.0009Z",
			errorIs:   assert.NoError,
			returnIs:  assert.Equal,
			returnVal: 1136239445000,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			val, err := extractTimeStamp(tt.arg)
			tt.errorIs(t, err)
			tt.returnIs(t, tt.returnVal, val)
		})
	}
}

type extractValueArgs struct {
	value interface{}
	typ   string
}

func Test_extractValueForTable(t *testing.T) {
	tests := []struct {
		name         string
		args         extractValueArgs
		errorIs      assert.ErrorAssertionFunc
		rowValKindIs assert.ComparisonAssertionFunc
		rowValKind   datasource.RowValue_Kind
		rowValIs     assert.ComparisonAssertionFunc
		rowValField  string
		DoubleValue  float64
		Int64Val     int64
		BoolValue    bool
		StringValue  string
		bytesVal     []byte
	}{
		{
			name:    "nonsense type should err",
			args:    extractValueArgs{false, "anafarg"},
			errorIs: assert.Error,
		},
		{
			name:         "should extract bool as bool",
			args:         extractValueArgs{true, "bool"},
			errorIs:      assert.NoError,
			rowValKindIs: assert.Equal,
			rowValKind:   datasource.RowValue_TYPE_BOOL,
			rowValField:  "BoolValue",
			rowValIs:     assert.Equal,
			BoolValue:    true,
		},
		{
			name:         "should extract string as string",
			args:         extractValueArgs{"Grafana <3 Azure", "string"},
			errorIs:      assert.NoError,
			rowValKindIs: assert.Equal,
			rowValKind:   datasource.RowValue_TYPE_STRING,
			rowValField:  "StringValue",
			rowValIs:     assert.Equal,
			StringValue:  "Grafana <3 Azure",
		},
		{
			name:         "should extract datetime as string",
			args:         extractValueArgs{"2006-01-02T22:04:05.1Z", "datetime"},
			errorIs:      assert.NoError,
			rowValKindIs: assert.Equal,
			rowValKind:   datasource.RowValue_TYPE_STRING,
			rowValField:  "StringValue",
			rowValIs:     assert.Equal,
			StringValue:  "2006-01-02T22:04:05.1Z",
		},
		{
			name: "should extract dynamic as string",
			args: extractValueArgs{[]map[string]interface{}{
				map[string]interface{}{"person": "Daniel"},
				map[string]interface{}{"cats": 23},
				map[string]interface{}{"diagnosis": "cat problem"},
			}, "dynamic"},
			errorIs:      assert.NoError,
			rowValKindIs: assert.Equal,
			rowValKind:   datasource.RowValue_TYPE_STRING,
			rowValField:  "StringValue",
			rowValIs:     assert.Equal,
			StringValue:  `[{"person":"Daniel"},{"cats":23},{"diagnosis":"cat problem"}]`,
		},
		{
			name:         "should extract int (32) as int64",
			args:         extractValueArgs{json.Number("2147483647"), "int"},
			errorIs:      assert.NoError,
			rowValKindIs: assert.Equal,
			rowValKind:   datasource.RowValue_TYPE_INT64,
			rowValField:  "Int64Val",
			rowValIs:     assert.Equal,
			Int64Val:     2147483647,
		},
		{
			name:         "should extract long as int64",
			args:         extractValueArgs{json.Number("9223372036854775807"), "long"},
			errorIs:      assert.NoError,
			rowValKindIs: assert.Equal,
			rowValKind:   datasource.RowValue_TYPE_INT64,
			rowValField:  "Int64Val",
			rowValIs:     assert.Equal,
			Int64Val:     9223372036854775807,
		},
		{
			name:         "should extract real as float64",
			args:         extractValueArgs{json.Number("1.797693134862315708145274237317043567981e+308"), "real"},
			errorIs:      assert.NoError,
			rowValKindIs: assert.Equal,
			rowValKind:   datasource.RowValue_TYPE_DOUBLE,
			rowValField:  "DoubleValue",
			rowValIs:     assert.Equal,
			DoubleValue:  1.797693134862315708145274237317043567981e+308,
		},
		{
			name:         "should extract timespan as string",
			args:         extractValueArgs{"00:00:00.0000001", "timespan"},
			errorIs:      assert.NoError,
			rowValKindIs: assert.Equal,
			rowValKind:   datasource.RowValue_TYPE_STRING,
			rowValField:  "StringValue",
			rowValIs:     assert.Equal,
			StringValue:  "00:00:00.0000001",
		},
		{
			name:         "null bool should be null", // all types should be except string, but only bool and string are tested
			args:         extractValueArgs{nil, "bool"},
			errorIs:      assert.NoError,
			rowValKindIs: assert.Equal,
			rowValKind:   datasource.RowValue_TYPE_NULL,
		},
		{
			name:    "null string should be error", // as per documentation, null strings are not supported by Kusto
			args:    extractValueArgs{nil, "string"},
			errorIs: assert.Error,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rowValue, err := extractValueForTable(tt.args.value, tt.args.typ)
			tt.errorIs(t, err)
			if err != nil {
				return
			}
			tt.rowValKindIs(t, tt.rowValKind.String(), rowValue.Kind.String())
			switch tt.rowValField {
			case "BoolValue":
				tt.rowValIs(t, tt.BoolValue, rowValue.BoolValue)
			case "StringValue":
				tt.rowValIs(t, tt.StringValue, rowValue.StringValue)
			case "DoubleValue":
				tt.rowValIs(t, tt.DoubleValue, rowValue.DoubleValue)
			case "Int64Val":
				tt.rowValIs(t, tt.Int64Val, rowValue.Int64Value)
			case "":
				// case for NULL, no value to test, only Kind
				if tt.rowValKind != datasource.RowValue_TYPE_NULL {
					t.Error("test logic error, case should not be null (empty string) if RowValue is not TYPE_NULL")
				}
			default:
				t.Errorf("unexpected rowValField '%v' in test", tt.rowValField)
			}

		})
	}
}

func tableFromJSONFile(name string) (tr *TableResponse, err error) {
	file, err := os.Open(path.Join("./testdata", name))
	if err != nil {
		return
	}
	defer file.Close()
	return tableFromJSON(file)
}

func TestTableResponse_ToTables(t *testing.T) {
	tests := []struct {
		name     string
		testFile string
		errorIs  assert.ErrorAssertionFunc
		rowIdx   int
		rowIs    assert.ComparisonAssertionFunc
		rowVals  []*datasource.RowValue
	}{
		{
			name:     "single bool should have extracted value",
			testFile: "print_true.json",
			errorIs:  assert.NoError,
			rowIdx:   0,
			rowIs:    assert.Equal,
			rowVals: []*datasource.RowValue{
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_BOOL, BoolValue: true},
			},
		},
		{
			name:     "supported types should load with values",
			testFile: "supported_types_with_vals.json",
			errorIs:  assert.NoError,
			rowIdx:   0,
			rowIs:    assert.Equal,
			rowVals: []*datasource.RowValue{
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_BOOL, BoolValue: true},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_STRING, StringValue: "Grafana"},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_STRING, StringValue: "2006-01-02T22:04:05.1Z"},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_STRING, StringValue: `[{"person":"Daniel"},{"cats":23},{"diagnosis":"cat problem"}]`},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_STRING, StringValue: "74be27de-1e4e-49d9-b579-fe0b331d3642"},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_INT64, Int64Value: int64(2147483647)},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_INT64, Int64Value: int64(9223372036854775807)},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_DOUBLE, DoubleValue: float64(1.797693134862315708145274237317043567981e+308)},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_STRING, StringValue: "00:00:00.0000001"},
			},
		},
		{
			name:     "supported types should load with null values",
			testFile: "nulls_in_table.json",
			errorIs:  assert.NoError,
			rowIdx:   0,
			rowIs:    assert.Equal,
			rowVals: []*datasource.RowValue{
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_NULL},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_NULL},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_NULL},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_NULL},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_NULL},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_NULL},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_NULL},
				&datasource.RowValue{Kind: datasource.RowValue_TYPE_NULL},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			respTable, err := tableFromJSONFile(tt.testFile)
			if err != nil {
				t.Errorf("unable to run test '%v', could not load file '%v': %v", tt.name, tt.testFile, err)
			}

			tables, err := respTable.ToTables()
			tt.errorIs(t, err)
			if err != nil {
				return
			}
			tt.rowIs(t, tt.rowVals, tables[0].Rows[tt.rowIdx].Values)
		})
	}
}

func TestTableResponse_ToTimeSeries(t *testing.T) {
	tests := []struct {
		name                  string
		testFile              string
		errorIs               assert.ErrorAssertionFunc
		seriesCountIs         assert.ComparisonAssertionFunc
		seriesCount           int
		perSeriesValueCountIs assert.ComparisonAssertionFunc
		perSeriesValueCount   int
	}{
		{
			name:                  "should load multiple values and multiple labels",
			testFile:              "multi_label_multi_value_time_table.json",
			errorIs:               assert.NoError,
			seriesCountIs:         assert.Equal,
			seriesCount:           8,
			perSeriesValueCountIs: assert.Equal,
			perSeriesValueCount:   5,
		},
		{
			name:     "more than one datetime should error",
			testFile: "timeseries_too_many_datetime.json",
			errorIs:  assert.Error,
		},
		{
			name:     "no value columns should error",
			testFile: "timeseries_no_value.json",
			errorIs:  assert.Error,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			respTable, err := tableFromJSONFile(tt.testFile)
			if err != nil {
				t.Errorf("unable to run test '%v', could not load file '%v': %v", tt.name, tt.testFile, err)
			}

			series, err := respTable.ToTimeSeries()
			tt.errorIs(t, err)
			if err != nil {
				return
			}
			tt.seriesCountIs(t, tt.seriesCount, len(series))
			for _, s := range series {
				tt.perSeriesValueCountIs(t, tt.perSeriesValueCount, len(s.Points))
			}
		})
	}
}
