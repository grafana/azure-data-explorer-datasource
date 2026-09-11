package models

import (
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

// Declaring a jsonData property that used to be an ignored unknown field turns a
// loosely typed provisioned value into a fatal unmarshal error that stops the
// datasource from loading. See the comment at the top of lenient.go.
func TestLoadToleratesLooselyTypedSettings(t *testing.T) {
	const clusterURL = `"clusterUrl":"https://test.kusto.windows.net"`

	tests := []struct {
		name     string
		jsonData string
		assert   func(*testing.T, *DatasourceSettings)
	}{
		{
			name:     "quoted number",
			jsonData: `{"minimalCache":"30"}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.Equal(t, LenientInt(30), d.MinimalCache)
			},
		},
		{
			name:     "non-integral number",
			jsonData: `{"minimalCache":30.5}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.Equal(t, LenientInt(30), d.MinimalCache)
			},
		},
		{
			name:     "unparseable number",
			jsonData: `{"minimalCache":{"nested":true}}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.Equal(t, LenientInt(0), d.MinimalCache)
			},
		},
		{
			name:     "quoted booleans",
			jsonData: `{"useSchemaMapping":"true","enableSecureSocksProxy":"True","onBehalfOf":"1","oauthPassThru":"false"}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.True(t, bool(d.UseSchemaMapping))
				require.True(t, bool(d.EnableSecureSocksProxy))
				require.True(t, bool(d.OnBehalfOf))
				require.False(t, bool(d.OAuthPassThru))
			},
		},
		{
			name:     "numeric boolean",
			jsonData: `{"useSchemaMapping":1}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.True(t, bool(d.UseSchemaMapping))
			},
		},
		{
			name:     "unparseable boolean",
			jsonData: `{"useSchemaMapping":"yes please"}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.False(t, bool(d.UseSchemaMapping))
			},
		},
		{
			name:     "comma separated list",
			jsonData: `{"keepCookies":"grafana_session, other_cookie"}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.Equal(t, LenientStringSlice{"grafana_session", "other_cookie"}, d.KeepCookies)
			},
		},
		{
			name:     "list with non-string entries",
			jsonData: `{"keepCookies":["grafana_session",7]}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.Equal(t, LenientStringSlice{"grafana_session"}, d.KeepCookies)
			},
		},
		{
			name:     "schema mappings keyed by name instead of a list",
			jsonData: `{"schemaMappings":{"mapping":{"type":"table"}}}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.Empty(t, d.SchemaMappings)
			},
		},
		{
			name:     "schema mappings with a wrongly typed entry field",
			jsonData: `{"schemaMappings":[{"type":"table","name":7,"database":"db"}]}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.Len(t, d.SchemaMappings, 1)
				require.Equal(t, LenientString("table"), d.SchemaMappings[0].Type)
				require.Equal(t, LenientString("db"), d.SchemaMappings[0].Database)
			},
		},
		{
			name:     "non-string credential fields",
			jsonData: `{"tenantId":123,"defaultEditorMode":true}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.Equal(t, LenientString("123"), d.TenantID)
				require.Equal(t, LenientString("true"), d.DefaultEditorMode)
			},
		},
		{
			name:     "null values",
			jsonData: `{"minimalCache":null,"useSchemaMapping":null,"keepCookies":null,"schemaMappings":null,"azureCredentials":null}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.Equal(t, LenientInt(0), d.MinimalCache)
				require.Empty(t, d.KeepCookies)
			},
		},
		{
			name:     "well typed values still parse",
			jsonData: `{"minimalCache":30,"useSchemaMapping":true,"keepCookies":["a"],"schemaMappings":[{"type":"table","value":"v","name":"n","database":"d","displayName":"dn"}],"azureCredentials":{"authType":"clientsecret","tenantId":"t","clientId":"c"}}`,
			assert: func(t *testing.T, d *DatasourceSettings) {
				require.Equal(t, LenientInt(30), d.MinimalCache)
				require.True(t, bool(d.UseSchemaMapping))
				require.Equal(t, LenientStringSlice{"a"}, d.KeepCookies)
				require.Len(t, d.SchemaMappings, 1)
				require.Equal(t, LenientString("dn"), d.SchemaMappings[0].DisplayName)
				require.Equal(t, LenientString("clientsecret"), d.AzureCredentials.AuthType)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			jsonData := `{` + clusterURL + `,` + tt.jsonData[1:]

			settings := &DatasourceSettings{}
			err := settings.Load(backend.DataSourceInstanceSettings{JSONData: []byte(jsonData)})
			require.NoError(t, err)
			tt.assert(t, settings)
		})
	}
}

// Leniency is scoped to the properties the backend ignores: a wrong type on a
// property the plugin acts on is a real error and is still reported.
func TestLoadStillRejectsWronglyTypedActiveSettings(t *testing.T) {
	settings := &DatasourceSettings{}
	err := settings.Load(backend.DataSourceInstanceSettings{
		JSONData: []byte(`{"clusterUrl":"https://test.kusto.windows.net","dynamicCaching":"true"}`),
	})
	require.ErrorContains(t, err, "could not unmarshal DatasourceSettings json")
}
