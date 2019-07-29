package azuredx

import (
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

func TestExtractValue(t *testing.T) {
	tests := []struct {
		name         string
		args         extractValueArgs
		errorIs      assert.ErrorAssertionFunc
		rowValKindIs assert.ComparisonAssertionFunc
		rowValKind   datasource.RowValue_Kind
		rowValIs     assert.ComparisonAssertionFunc
		rowValField  string
		doubleVal    float64
		int64Val     int64
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
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rowValue, err := ExtractValue(tt.args.value, tt.args.typ)
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
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			respTable, err := tableFromJSONFile(tt.testFile)
			if err != nil {
				t.Errorf("unable to run test '%v', could not load file '%v': %v", tt.name, tt.testFile, err)
			}
			if len(respTable.Tables) == 0 {
				t.Errorf("problem loading table, expected one or more tables, got zero.")
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
