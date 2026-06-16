package models

import (
	"fmt"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
)

func TestMacroData_Interpolate(t *testing.T) {
	fromTime := time.Date(2019, 7, 30, 20, 2, 33, 0, time.UTC)
	fromString := "datetime(2019-07-30T20:02:33Z)"
	toTime := time.Date(2019, 7, 30, 20, 7, 33, 0, time.UTC)
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
			macroData: NewMacroData(&backend.TimeRange{
				From: fromTime,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeFrom",
			returnIs:  assert.Equal,
			returnVal: fromString,
		},
		{
			name: "should parse $__timeFrom with spaces",
			macroData: NewMacroData(&backend.TimeRange{
				From: fromTime,
			}, 0),
			errorIs:   assert.NoError,
			query:     " $__timeFrom ",
			returnIs:  assert.Equal,
			returnVal: fmt.Sprintf(" %v ", fromString),
		},
		{
			name: "should parse $__timeTo",
			macroData: NewMacroData(&backend.TimeRange{
				To: toTime,
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
			macroData: NewMacroData(&backend.TimeRange{
				From: fromTime,
				To:   toTime,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeFilter()",
			returnIs:  assert.Equal,
			returnVal: fmt.Sprintf("TimeGenerated >= %v and TimeGenerated <= %v", fromString, toString),
		},
		{
			name: "should parse $__timeFilter(CatCount)",
			macroData: NewMacroData(&backend.TimeRange{
				From: fromTime,
				To:   toTime,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeFilter(CatCount)",
			returnIs:  assert.Equal,
			returnVal: fmt.Sprintf("CatCount >= %v and CatCount <= %v", fromString, toString),
		},
		{
			name: "should parse $__timeFilter([\"Cat Count\"])",
			macroData: NewMacroData(&backend.TimeRange{
				From: fromTime,
				To:   toTime,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeFilter([\"Cat Count\"])",
			returnIs:  assert.Equal,
			returnVal: fmt.Sprintf(`["Cat Count"] >= %v and ["Cat Count"] <= %v`, fromString, toString),
		},
		{
			name: "should parse and quote identifier with space",
			macroData: NewMacroData(&backend.TimeRange{
				From: fromTime,
				To:   toTime,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeFilter(value with space)",
			returnIs:  assert.Equal,
			returnVal: fmt.Sprintf("['value with space'] >= %v and ['value with space'] <= %v", fromString, toString),
		},
		{
			name: "should parse and quote identifier with dot",
			macroData: NewMacroData(&backend.TimeRange{
				From: fromTime,
				To:   toTime,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeFilter(identifier.with.dot)",
			returnIs:  assert.Equal,
			returnVal: fmt.Sprintf("['identifier.with.dot'] >= %v and ['identifier.with.dot'] <= %v", fromString, toString),
		},
		{
			name: "should parse and quote identifier with dashes",
			macroData: NewMacroData(&backend.TimeRange{
				From: fromTime,
				To:   toTime,
			}, 0),
			errorIs:   assert.NoError,
			query:     "$__timeFilter(identifier-with-dashes)",
			returnIs:  assert.Equal,
			returnVal: fmt.Sprintf("['identifier-with-dashes'] >= %v and ['identifier-with-dashes'] <= %v", fromString, toString),
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
