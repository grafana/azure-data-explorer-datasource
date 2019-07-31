package azuredx

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/grafana/grafana_plugin_model/go/datasource"
)

//  Macros:
//   - $__timeFilter() -> TimeGenerated ≥ datetime(2018-06-05T18:09:58.907Z) and TimeGenerated ≤ datetime(2018-06-05T20:09:58.907Z)
//   - $__timeFilter(datetimeColumn) ->  datetimeColumn  ≥ datetime(2018-06-05T18:09:58.907Z) and datetimeColumn ≤ datetime(2018-06-05T20:09:58.907Z)
//   - $__from ->  datetime(2018-06-05T18:09:58.907Z)
//   - $__to -> datetime(2018-06-05T20:09:58.907Z)
//   - $__interval -> 5m

// MacroData contains the information needed
type MacroData struct {
	*datasource.TimeRange
	intervalMS int64
}

// NewMacroData creates a MacroData object from the arguments that
// can be used to interpolate macros with the Interpolate method.
func NewMacroData(tr *datasource.TimeRange, intervalMS int64) MacroData {
	return MacroData{
		TimeRange:  tr,
		intervalMS: intervalMS,
	}
}

// macroRE is a regular expression to match available macros
var macroRE = regexp.MustCompile(`\$__` + // Prefix: $__
	`(timeFilter|from|to|interval)` + // one of macro root names
	`(\(\w*?\))?`) // optional () or optional (someArg)

// Interpolate replaces macros with their values for the given query.
func (md MacroData) Interpolate(query string) (string, error) {
	errorStrings := []string{}
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
			errorStrings = append(errorStrings, fmt.Sprintf("failed to interpolate, could not find function '%v'", funcName))
			return ""
		}
		arg := ""
		if len(varSplit) > 1 {
			arg = varSplit[1]
		}
		return funcToCall(arg, md)
	}
	interpolated := macroRE.ReplaceAllStringFunc(query, replaceAll)
	if len(errorStrings) > 0 {
		return "", fmt.Errorf("failed to interpolate query, errors: %v", strings.Join(errorStrings, "\n"))
	}
	return interpolated, nil
}

var interpolationFuncs = map[string]func(string, MacroData) string{
	"$__from":       fromMacro,
	"$__to":         toMacro,
	"$__timeFilter": timeFilterMacro,
	"$__interval":   intervalMacro,
}

func fromMacro(s string, md MacroData) string {
	from := time.Unix(0, md.FromEpochMs*1e6)
	return fmt.Sprintf("datetime(%v)", from.UTC().Format(time.RFC3339Nano))
}

func toMacro(s string, md MacroData) string {
	to := time.Unix(0, md.ToEpochMs*1e6)
	return fmt.Sprintf("datetime(%v)", to.UTC().Format(time.RFC3339Nano))
}

func intervalMacro(s string, md MacroData) string {
	return fmt.Sprintf("%vms", md.intervalMS)
}

func timeFilterMacro(s string, md MacroData) string {
	if s == "" {
		s = "TimeGenerated"
	}
	from := time.Unix(0, md.FromEpochMs*1e6)
	to := time.Unix(0, md.ToEpochMs*1e6)
	fmtString := "%v >= datetime(%v) and %v <= datetime(%v)"
	return fmt.Sprintf(fmtString, s, from.UTC().Format(time.RFC3339Nano), s, to.UTC().Format(time.RFC3339Nano))
}
