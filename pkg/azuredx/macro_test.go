package azuredx

import (
	"fmt"
	"testing"

	"github.com/grafana/grafana_plugin_model/go/datasource"
	"github.com/stretchr/testify/assert"
)

func TestMacroData_Interpolate(t *testing.T) {
	fromEpochMS := int64(1564516953 * 1000)
	fromString := "datetime(2019-07-30T20:02:33Z)"
	toEpochMS := int64((1564516953 + 300) * 1000)
	toString := "datetime(2019-07-30T20:07:33Z)"

	tests := []struct {
		name      string
		macroData MacroData
		query     string
		errorIs   assert.ErrorAssertionFunc
		returnIs  assert.ComparisonAssertionFunc
		returnVal string
	}{
		{
			name: "should parse $__timeFrom",
			macroData: NewMacroData(&datasource.TimeRange{
				FromEpochMs: fromEpochMS,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeFrom",
			returnIs:  assert.Equal,
			returnVal: fromString,
		},
		{
			name: "should parse $__timeFrom with spaces",
			macroData: NewMacroData(&datasource.TimeRange{
				FromEpochMs: fromEpochMS,
			}, 0),
			errorIs:   assert.NoError,
			query:     " $__timeFrom ",
			returnIs:  assert.Equal,
			returnVal: fmt.Sprintf(" %v ", fromString),
		},
		{
			name: "should parse $__timeTo",
			macroData: NewMacroData(&datasource.TimeRange{
				ToEpochMs: toEpochMS,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeTo",
			returnIs:  assert.Equal,
			returnVal: toString,
		},
		{
			name:      "should parse $__timeInterval",
			macroData: NewMacroData(nil, 12),
			errorIs:   assert.NoError,
			query:     "$__timeInterval",
			returnIs:  assert.Equal,
			returnVal: "12ms",
		},
		{
			name: "should parse $__timeFilter()",
			macroData: NewMacroData(&datasource.TimeRange{
				FromEpochMs: fromEpochMS,
				ToEpochMs:   toEpochMS,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeFilter()",
			returnIs:  assert.Equal,
			returnVal: fmt.Sprintf("TimeGenerated >= %v and TimeGenerated <= %v", fromString, toString),
		},
		{
			name: "should parse $__timeFilter(CatCount)",
			macroData: NewMacroData(&datasource.TimeRange{
				FromEpochMs: fromEpochMS,
				ToEpochMs:   toEpochMS,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeFilter(CatCount)",
			returnIs:  assert.Equal,
			returnVal: fmt.Sprintf("CatCount >= %v and CatCount <= %v", fromString, toString),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			val, err := tt.macroData.Interpolate(tt.query)
			tt.errorIs(t, err)
			tt.returnIs(t, tt.returnVal, val)
		})
	}
}
