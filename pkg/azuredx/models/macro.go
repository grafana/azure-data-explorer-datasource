package models

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

//  Macros:
//   - $__timeFilter() -> TimeGenerated ≥ datetime(2018-06-05T18:09:58.907Z) and TimeGenerated ≤ datetime(2018-06-05T20:09:58.907Z)
//   - $__timeFilter(datetimeColumn) ->  datetimeColumn  ≥ datetime(2018-06-05T18:09:58.907Z) and datetimeColumn ≤ datetime(2018-06-05T20:09:58.907Z)
//   - $__from ->  datetime(2018-06-05T18:09:58.907Z)
//   - $__to -> datetime(2018-06-05T20:09:58.907Z)
//   - $__interval -> 5m

// MacroData contains the information needed for macro expansion.
type MacroData struct {
	*backend.TimeRange
	intervalMS int64
	// pointer to map with intervalFuncs
}

// NewMacroData creates a MacroData object from the arguments that
// can be used to interpolate macros with the Interpolate method.
func NewMacroData(tr *backend.TimeRange, intervalMS int64) MacroData {
	return MacroData{
		TimeRange:  tr,
		intervalMS: intervalMS,
	}
}

// macroRE is a regular expression to match available macros
var macroRE = regexp.MustCompile(`\$__` + // Prefix: $__
	`(timeFilter|timeFrom|timeTo|timeInterval)` + // one of macro root names
	`(\([a-zA-Z0-9_\s\[\]\"\'.-]*?\))?`) // optional () or optional (someArg)

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
			arg = quoteForSpacesDotsDashes(varSplit[1])
		}
		return funcToCall(arg, md)
	}
	interpolated := macroRE.ReplaceAllStringFunc(query, replaceAll)
	if len(errorStrings) > 0 {
		return "", fmt.Errorf("failed to interpolate query, errors: %v", strings.Join(errorStrings, "\n"))
	}
	return interpolated, nil
}

func quoteForSpacesDotsDashes(s string) string {
	// https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/schema-entities/entity-names#identifier-quoting
	if strings.ContainsAny(s, " .-") && !strings.ContainsAny(s, "['\"]") {
		return fmt.Sprintf("['%s']", s)
	}
	return s
}

var interpolationFuncs = map[string]func(string, MacroData) string{
	"$__timeFrom":     timeFromMacro,
	"$__timeTo":       timeToMacro,
	"$__timeFilter":   timeFilterMacro,
	"$__timeInterval": timeIntervalMacro,
}

func timeFromMacro(s string, md MacroData) string {
	return fmt.Sprintf("datetime(%v)", md.From.UTC().Format(time.RFC3339Nano))
}

func timeToMacro(s string, md MacroData) string {
	return fmt.Sprintf("datetime(%v)", md.To.UTC().Format(time.RFC3339Nano))
}

func timeIntervalMacro(s string, md MacroData) string {
	if md.intervalMS == 0 {
		md.intervalMS = 1000 // Default of 1000 (millisecond)
	}
	return fmt.Sprintf("%vms", md.intervalMS)
}

func timeFilterMacro(s string, md MacroData) string {
	if s == "" {
		s = "TimeGenerated"
	}
	fmtString := "%v >= datetime(%v) and %v <= datetime(%v)"
	timeString := fmt.Sprintf(fmtString, s, md.From.UTC().Format(time.RFC3339Nano), s, md.To.UTC().Format(time.RFC3339Nano))
	backend.Logger.Debug("Time String", "value", timeString)
	return timeString
}
