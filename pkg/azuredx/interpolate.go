package azuredx

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/grafana/grafana_plugin_model/go/datasource"
)

// TODO
//  Macros:
//   - $__timeFilter() -> TimeGenerated ≥ datetime(2018-06-05T18:09:58.907Z) and TimeGenerated ≤ datetime(2018-06-05T20:09:58.907Z)
//   - $__timeFilter(datetimeColumn) ->  datetimeColumn  ≥ datetime(2018-06-05T18:09:58.907Z) and datetimeColumn ≤ datetime(2018-06-05T20:09:58.907Z)
//   - $__from ->  datetime(2018-06-05T18:09:58.907Z)
//   - $__to -> datetime(2018-06-05T20:09:58.907Z)
//   - $__interval -> 5m

// Will not DO (because information does not exist outside of alerting as a feature currently)
//  - $__escapeMulti($myTemplateVar) -> $myTemplateVar should be a multi-value template variables that contains illegal characters
//  - $__contains(aColumn, $myTemplateVar) -> aColumn in ($myTemplateVar)

var varRE = regexp.MustCompile(`\$__(timeFilter|from|to|interval)(\(\w*?\))?`)

type TimeRangeInterpolator struct {
	*datasource.TimeRange
}

func (ti TimeRangeInterpolator) Interpolate(query string) (string, error) {
	replaceAll := func(varMatch string) string {
		varSplit := strings.FieldsFunc(varMatch, func(r rune) bool {
			if r == '(' || r == ')' {
				return true
			}
			return false
		})
		funcName := varSplit[0]
		funcToCall, ok := interpolationFuncs[funcName]
		if !ok {
			return ""
		}
		return funcToCall("", ti.TimeRange)
	}
	return varRE.ReplaceAllStringFunc(query, replaceAll), nil
}

var interpolationFuncs = map[string]func(string, *datasource.TimeRange) string{
	"$__from": interpolateFrom,
}

func interpolateFrom(s string, tr *datasource.TimeRange) string {
	t := time.Unix(0, tr.FromEpochMs*1e6)
	return fmt.Sprintf("datetime(%v)", t.UTC().Format(time.RFC3339Nano))
}
