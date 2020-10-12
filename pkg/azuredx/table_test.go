package azuredx

import (
	"os"
	"path"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/xorcare/pointer"
)

func tableFromJSONFile(name string) (tr *TableResponse, err error) {
	file, err := os.Open(path.Join("./testdata", name))
	if err != nil {
		return
	}
	defer file.Close()
	return tableFromJSON(file)
}

func TestResponseToFrames(t *testing.T) {
	tests := []struct {
		name     string
		testFile string
		errorIs  assert.ErrorAssertionFunc
		frame    *data.Frame
	}{
		{
			name:     "single bool should have extracted value",
			testFile: "print_true.json",
			errorIs:  assert.NoError,
			frame: data.NewFrame("", data.NewField("print_0", nil, []*bool{pointer.Bool(true)})).SetMeta(
				&data.FrameMeta{Custom: AzureFrameMD{ColumnTypes: []string{"bool"}}},
			),
		},
		{
			name:     "supported types should load with values",
			testFile: "supported_types_with_vals.json",
			errorIs:  assert.NoError,
			frame: data.NewFrame("",
				data.NewField("XBool", nil, []*bool{pointer.Bool(true)}),
				data.NewField("XString", nil, []*string{pointer.String("Grafana")}),
				data.NewField("XDateTime", nil, []*time.Time{pointer.Time(time.Date(2006, 1, 2, 22, 4, 5, 1*1e8, time.UTC))}),
				data.NewField("XDynamic", nil, []string{`[{"person":"Daniel"},{"cats":23},{"diagnosis":"cat problem"}]`}),
				data.NewField("XGuid", nil, []*string{pointer.String("74be27de-1e4e-49d9-b579-fe0b331d3642")}),
				data.NewField("XInt", nil, []*int32{pointer.Int32(2147483647)}),
				data.NewField("XLong", nil, []*int64{pointer.Int64(9223372036854775807)}),
				data.NewField("XReal", nil, []*float64{pointer.Float64(1.797693134862315708145274237317043567981e+308)}),
				data.NewField("XTimeSpan", nil, []*string{pointer.String("00:00:00.0000001")}),
				data.NewField("XDecimal", nil, []*float64{pointer.Float64(4.52686980609418)}),
			).SetMeta(
				&data.FrameMeta{Custom: AzureFrameMD{ColumnTypes: []string{"bool", "string", "datetime",
					"dynamic", "guid", "int", "long", "real", "timespan", "decimal"}}},
			),
		},
		{
			name:     "supported types should load with null values",
			testFile: "nulls_in_table.json",
			errorIs:  assert.NoError,
			frame: data.NewFrame("",
				data.NewField("XBool", nil, []*bool{nil}),
				data.NewField("XDateTime", nil, []*time.Time{nil}),
				data.NewField("XDynamic", nil, []string{"null"}),
				data.NewField("XGuid", nil, []*string{nil}),
				data.NewField("XInt", nil, []*int32{nil}),
				data.NewField("XLong", nil, []*int64{nil}),
				data.NewField("XReal", nil, []*float64{nil}),
				data.NewField("XTimeSpan", nil, []*string{nil}),
				data.NewField("XDecimal", nil, []*float64{nil}),
			).SetMeta(
				&data.FrameMeta{Custom: AzureFrameMD{ColumnTypes: []string{"bool", "datetime",
					"dynamic", "guid", "int", "long", "real", "timespan"}}},
			),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			respTable, err := tableFromJSONFile(tt.testFile)
			if err != nil {
				t.Errorf("unable to run test '%v', could not load file '%v': %v", tt.name, tt.testFile, err)
			}

			frames, err := respTable.ToDataFrames("")
			tt.errorIs(t, err)
			if err != nil {
				return
			}
			if diff := cmp.Diff(tt.frame, frames[0], data.FrameTestCompareOptions()...); diff != "" {
				t.Errorf("Result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func TestTableResponse_ToADXTimeSeries(t *testing.T) {
	tests := []struct {
		name                  string
		testFile              string // use either file or table, not both
		testTable             *TableResponse
		errorIs               require.ErrorAssertionFunc
		seriesCountIs         require.ComparisonAssertionFunc
		seriesCount           int
		perSeriesValueCountIs require.ComparisonAssertionFunc
		perSeriesValueCount   int
	}{
		{
			name:                  "should load series response",
			testFile:              "adx_timeseries_multi_label_multi_value.json",
			seriesCountIs:         require.Equal,
			seriesCount:           8,
			perSeriesValueCountIs: require.Equal,
			perSeriesValueCount:   10,
		},
		{
			name:                  "should not err with null valued object column",
			testFile:              "adx_timeseries_null_value_column.json",
			seriesCountIs:         require.Equal,
			seriesCount:           8,
			perSeriesValueCountIs: require.Equal,
			perSeriesValueCount:   216,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.testFile != "" && tt.testTable != nil {
				t.Errorf("test logic error: test should not have both a testFile and a testTable")
			}
			var err error
			respTable := tt.testTable
			if tt.testFile != "" {
				respTable, err = tableFromJSONFile(tt.testFile)
				if err != nil {
					t.Errorf("unable to run test '%v', could not load file '%v': %v", tt.name, tt.testFile, err)
				}
			}

			initialFrames, err := respTable.ToDataFrames("T | select NotActualQuery")
			require.NoError(t, err)

			require.Equal(t, 1, len(initialFrames))

			convertedFrame, err := ToADXTimeSeries(initialFrames[0])
			require.NoError(t, err)

			tt.seriesCountIs(t, tt.seriesCount, len(convertedFrame.Fields)-1)
			for i, f := range convertedFrame.Fields {
				tt.perSeriesValueCountIs(t, tt.perSeriesValueCount, f.Len(), "for field named %v at index %v", f.Name, i)
			}
		})
	}
}
