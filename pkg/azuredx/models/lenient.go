package models

import (
	"encoding/json"
	"strconv"
	"strings"
)

// Load unmarshals all of jsonData at once, so one property whose stored type
// does not match its struct field fails the unmarshal and NewDatasource with it,
// leaving the datasource unable to serve queries. The properties declared only
// for parity with pkg/schema/dsconfig.json are the risk: they were ignored as
// unknown fields until declared, so minimalCache: "30" from hand-written
// provisioning used to be harmless. These types accept the schema's shape plus
// the loosely typed forms provisioning produces, and fall back to the zero value
// rather than erroring. Properties the backend acts on stay strict - a wrong
// type there is a real error. None define MarshalJSON, so their Go kind still
// matches the schema valueType that JSONDataTypesMatchStruct checks.

// LenientBool also accepts the string and numeric spellings of a boolean.
type LenientBool bool

func (b *LenientBool) UnmarshalJSON(data []byte) error {
	var value bool
	if err := json.Unmarshal(data, &value); err == nil {
		*b = LenientBool(value)
		return nil
	}

	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		if parsed, err := strconv.ParseBool(strings.TrimSpace(str)); err == nil {
			*b = LenientBool(parsed)
		}
		return nil
	}

	var number float64
	if err := json.Unmarshal(data, &number); err == nil {
		*b = LenientBool(number != 0)
	}

	return nil
}

// LenientInt also accepts quoted and non-integral numbers. dsconfig has no
// integer valueType, so a stored 30.5 is schema-valid and must not be rejected.
type LenientInt int

func (i *LenientInt) UnmarshalJSON(data []byte) error {
	var number float64
	if err := json.Unmarshal(data, &number); err == nil {
		*i = LenientInt(number)
		return nil
	}

	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		if parsed, err := strconv.ParseFloat(strings.TrimSpace(str), 64); err == nil {
			*i = LenientInt(parsed)
		}
	}

	return nil
}

// LenientString keeps a stored scalar as its JSON text rather than dropping it,
// so the credential fields that adxcredentials reads from the raw jsonData map
// (reporting its own clearer errors) are not silently blanked here.
type LenientString string

func (s *LenientString) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		*s = LenientString(str)
		return nil
	}

	var scalar any
	if err := json.Unmarshal(data, &scalar); err == nil {
		switch scalar.(type) {
		case float64, bool:
			*s = LenientString(strings.TrimSpace(string(data)))
		}
	}

	return nil
}

// LenientStringSlice also accepts a comma-separated string, and an array with
// non-string entries, keeping the entries it can use.
type LenientStringSlice []string

func (s *LenientStringSlice) UnmarshalJSON(data []byte) error {
	var values []string
	if err := json.Unmarshal(data, &values); err == nil {
		*s = values
		return nil
	}

	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		*s = splitAndTrim(str)
		return nil
	}

	var mixed []any
	if err := json.Unmarshal(data, &mixed); err == nil {
		result := make(LenientStringSlice, 0, len(mixed))
		for _, item := range mixed {
			if value, ok := item.(string); ok {
				result = append(result, value)
			}
		}
		*s = result
	}

	return nil
}

// LenientSchemaMappings drops an entry that does not fit SchemaMapping instead
// of failing the whole unmarshal, and ignores a value that is not an array.
type LenientSchemaMappings []SchemaMapping

func (m *LenientSchemaMappings) UnmarshalJSON(data []byte) error {
	var mappings []SchemaMapping
	if err := json.Unmarshal(data, &mappings); err == nil {
		*m = mappings
		return nil
	}

	var raw []json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil
	}

	result := make(LenientSchemaMappings, 0, len(raw))
	for _, entry := range raw {
		var mapping SchemaMapping
		if err := json.Unmarshal(entry, &mapping); err == nil {
			result = append(result, mapping)
		}
	}
	*m = result

	return nil
}

func splitAndTrim(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	if len(result) == 0 {
		return nil
	}

	return result
}
