package models

// options are properties that can be set on the ADX Connection string.
// https://docs.microsoft.com/en-us/azure/data-explorer/kusto/api/netfx/request-properties
type options struct {
	DataConsistency string `json:"queryconsistency,omitempty"`
	CacheMaxAge     string `json:"query_results_cache_max_age,omitempty"`
	ServerTimeout   string `json:"servertimeout,omitempty"`
}

// RequestPayload is the information that makes up a Kusto query for Azure's Data Explorer API.
type RequestPayload struct {
	DB          string      `json:"db"`
	CSL         string      `json:"csl"`
	QuerySource string      `json:"querySource"`
	Properties  *Properties `json:"properties,omitempty"`
}

type ARGRequestPayload struct {
	Query string `json:"query"`
}

// AzureFrameMD is a type to populate a Frame's Custom metadata property.
type AzureFrameMD struct {
	ColumnTypes []string
}

// errorResponse is a minimal structure of Azure Data Explorer's JSON
// error body,
type ErrorResponse struct {
	Error struct {
		Message     string `json:"message"`
		Type        string `json:"@type"`
		Description string `json:"@message"`
	} `json:"error"`
}

// Properties is a property bag of connection string options.
type Properties struct {
	Options *options `json:"options,omitempty"`
}

type ClusterOption struct {
	Name string `json:"name,omitempty"`
	Uri  string `json:"uri,omitempty"`
}

// NewConnectionProperties creates ADX connection properties based on datasource settings.
func NewConnectionProperties(s *DatasourceSettings, cs *CacheSettings) *Properties {
	cacheMaxAge := s.CacheMaxAge
	if cs != nil {
		cacheMaxAge = cs.CacheMaxAge
	}

	return &Properties{
		&options{
			DataConsistency: s.DataConsistency,
			CacheMaxAge:     cacheMaxAge,
			ServerTimeout:   s.ServerTimeoutValue,
		},
	}
}
