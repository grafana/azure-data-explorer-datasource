package schema_test

import (
	_ "embed"
	"testing"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/dsconfig/schema"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/pluginschema"
	"k8s.io/kube-openapi/pkg/spec3"
)

//go:embed dsconfig.json
var configSchemaJSON []byte

//go:generate go test -run TestPlugin -generateArtifacts
func TestPlugin(t *testing.T) {
	schema.RunPluginTests(t, schema.PluginUnderTest{
		ID:                "grafana-azure-data-explorer-datasource",
		ConfigSchemaJSON:  configSchemaJSON,
		SettingsJSONModel: models.DatasourceSettings{},
		SecureKeys:        []string{"azureClientSecret", "clientSecret", "OpenAIAPIKey"},
		SettingsExamples: &pluginschema.SettingsExamples{
			Examples: map[string]*spec3.Example{
				"": {
					ExampleProps: spec3.ExampleProps{
						Summary:     "App Registration + Client Secret",
						Description: "The default auth type: an Azure AD App Registration authenticating with a client secret. Always available, regardless of Grafana feature toggles.",
						Value: map[string]any{
							"clusterUrl": "https://mycluster.kusto.windows.net",
							"jsonData": map[string]any{
								"azureCredentials": map[string]any{
									"authType":   "clientsecret",
									"azureCloud": "AzureCloud",
									"tenantId":   "REPLACE_WITH_TENANT_ID",
									"clientId":   "REPLACE_WITH_CLIENT_ID",
								},
							},
							"secureJsonData": map[string]any{
								"azureClientSecret": "REPLACE_WITH_CLIENT_SECRET",
							},
						},
					},
				},
				"managedIdentity": {
					ExampleProps: spec3.ExampleProps{
						Summary:     "Managed Identity",
						Description: "Authenticate with an Azure Managed Identity assigned to the Grafana host. Only available when Grafana has the azure.managedIdentityEnabled feature toggle.",
						Value: map[string]any{
							"clusterUrl": "https://mycluster.kusto.windows.net",
							"jsonData": map[string]any{
								"azureCredentials": map[string]any{
									"authType": "msi",
								},
							},
						},
					},
				},
				"workloadIdentity": {
					ExampleProps: spec3.ExampleProps{
						Summary:     "Workload Identity",
						Description: "Authenticate with an Azure AD Workload Identity federated to the Kubernetes service account Grafana runs as. Only available when Grafana has the azure.workloadIdentityEnabled feature toggle.",
						Value: map[string]any{
							"clusterUrl": "https://mycluster.kusto.windows.net",
							"jsonData": map[string]any{
								"azureCredentials": map[string]any{
									"authType": "workloadidentity",
								},
							},
						},
					},
				},
				"currentUser": {
					ExampleProps: spec3.ExampleProps{
						Summary:     "Current user (identity forwarding)",
						Description: "Authenticate as the Grafana user viewing the dashboard. Only available when Grafana has the azure.userIdentityEnabled feature toggle. jsonData.oauthPassThru must be set to true — the Azure SDK sets it automatically from the UI, but omitting it here causes authentication to fail because Grafana won't forward the signed-in user's ID token.",
						Value: map[string]any{
							"clusterUrl": "https://mycluster.kusto.windows.net",
							"jsonData": map[string]any{
								"azureCredentials": map[string]any{
									"authType": "currentuser",
								},
								"oauthPassThru": true,
							},
						},
					},
				},
				"clientSecretObo": {
					ExampleProps: spec3.ExampleProps{
						Summary:     "App Registration On-Behalf-Of",
						Description: "An App Registration that exchanges the signed-in user's token for one scoped to Azure Data Explorer. Requires the adxOnBehalfOf Grafana feature toggle. jsonData.oauthPassThru must be true; the plugin backend rejects the datasource otherwise.",
						Value: map[string]any{
							"clusterUrl": "https://mycluster.kusto.windows.net",
							"jsonData": map[string]any{
								"azureCredentials": map[string]any{
									"authType":   "clientsecret-obo",
									"azureCloud": "AzureCloud",
									"tenantId":   "REPLACE_WITH_TENANT_ID",
									"clientId":   "REPLACE_WITH_CLIENT_ID",
								},
								"oauthPassThru": true,
							},
							"secureJsonData": map[string]any{
								"azureClientSecret": "REPLACE_WITH_CLIENT_SECRET",
							},
						},
					},
				},
			},
		},
	})
}
