package models

import (
	"encoding/json"
	"os"
	"path"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/experimental"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func tableFromJSONFile(name string) (tr *TableResponse, err error) {
	file, err := os.Open(path.Join("./testdata", name))
	if err != nil {
		return
	}
	defer file.Close()
	return TableFromJSON(file)
}

func TestResponseToFrames(t *testing.T) {
	var serviceTags json.RawMessage
	var tags json.RawMessage
	var logs json.RawMessage
	_ = serviceTags.UnmarshalJSON([]byte("[{\"key\": \"cloud_RoleInstance\", \"value\": \"test-cloud-id\"},{\"key\": \"cloud_RoleName\", \"value\": \"test-app\"}]"))
	_ = tags.UnmarshalJSON([]byte("[{\"key\":\"appId\",\"value\":\"test-app\"}]"))
	_ = logs.UnmarshalJSON([]byte("[{\"timestamp\": 1687260450000,\"fields\": [{\"key\":\"key\", \"value\": \"test\"},{\"key\":\"value\", \"value\": \"value\"}]}]"))
	var emptyArray json.RawMessage
	_ = emptyArray.UnmarshalJSON([]byte("[]"))
	tests := []struct {
		name     string
		testFile string
		errorIs  assert.ErrorAssertionFunc
		frame    *data.Frame
		format   string
	}{
		{
			name:     "single bool should have extracted value",
			testFile: "print_true.json",
			errorIs:  assert.NoError,
			format:   data.VisTypeTable,
		},
		{
			name:     "supported types should load with values",
			testFile: "supported_types_with_vals.json",
			errorIs:  assert.NoError,
			format:   data.VisTypeTable,
		},
		{
			name:     "supported types should load with null values",
			testFile: "nulls_in_table.json",
			errorIs:  assert.NoError,
			format:   data.VisTypeTable,
		},
		{
			name:     "number should be converted to bool",
			testFile: "convert_number_to_bool.json",
			errorIs:  assert.NoError,
			format:   data.VisTypeTable,
		},
		{
			name:     "traces should be converted to dataframe appropriately",
			testFile: "adx_traces_table.json",
			errorIs:  assert.NoError,
			format:   data.VisTypeTrace,
		},
		{
			name:     "traces with empty dynamics should be converted to dataframe appropriately",
			testFile: "adx_traces_table_empty_dynamics.json",
			errorIs:  assert.NoError,
			format:   data.VisTypeTrace,
		},
		{
			name:     "logs should be converted to dataframe appropriately",
			testFile: "adx_logs_table.json",
			errorIs:  assert.NoError,
			format:   data.VisTypeLogs,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			respTable, err := tableFromJSONFile(tt.testFile)
			if err != nil {
				t.Errorf("unable to run test '%v', could not load file '%v': %v", tt.name, tt.testFile, err)
			}

			frames, err := respTable.ToDataFrames("", tt.format)
			tt.errorIs(t, err)
			if err != nil {
				return
			}

			experimental.CheckGoldenJSONFrame(t, "./testdata/golden_data", tt.name, frames[0], false)
		})
	}

	t.Run("query with exceptions", func(t *testing.T) {
		_, err := tableFromJSONFile("query_with_exceptions.json")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Query execution lacks memory resources")
	})

	t.Run("query with no rows", func(t *testing.T) {
		respTable, err := tableFromJSONFile("no_rows.json")
		assert.NoError(t, err)
		frames, err := respTable.ToDataFrames("", "")
		assert.NoError(t, err)
		assert.Empty(t, frames)
	})
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

			initialFrames, err := respTable.ToDataFrames("T | select NotActualQuery", "")
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
