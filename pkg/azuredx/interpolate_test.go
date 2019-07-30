package azuredx

import (
	"testing"

	"github.com/grafana/grafana_plugin_model/go/datasource"
	"github.com/stretchr/testify/assert"
)

func TestTimeRangeInterpolator_Interpolate(t *testing.T) {
	tests := []struct {
		name         string
		interpolator TimeRangeInterpolator
		query        string
		errorIs      assert.ErrorAssertionFunc
		returnIs     assert.ComparisonAssertionFunc
		returnVal    string
	}{
		{
			name: "should parse $__from",
			interpolator: TimeRangeInterpolator{
				TimeRange: &datasource.TimeRange{
					FromEpochMs: 1564516953 * 1000,
					ToEpochMs:   2,
				},
			},
			errorIs:   assert.NoError,
			query:     "$__from",
			returnIs:  assert.Equal,
			returnVal: "datetime(2019-07-30T20:02:33Z)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			val, err := tt.interpolator.Interpolate(tt.query)
			tt.errorIs(t, err)
			tt.returnIs(t, tt.returnVal, val)
		})
	}
}
