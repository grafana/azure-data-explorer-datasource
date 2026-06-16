package models

// QueryModel contains the query information from the API call that we use to make a query.
type QueryModel struct {
	Format      string `json:"resultFormat"`
	QueryType   string `json:"queryType"`
	Query       string `json:"query"`
	Database    string `json:"database"`
	QuerySource string `json:"querySource"` // used to identify if query came from getSchema, raw mode, etc
	ClusterUri  string `json:"clusterUri,omitempty"`
	MacroData   MacroData
}

// Interpolate applies macro expansion on the QueryModel's Payload's Query string
func (qm *QueryModel) Interpolate() (err error) {
	qm.Query, err = qm.MacroData.Interpolate(qm.Query)
	return
}
