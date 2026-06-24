package schema_test

import (
	_ "embed"
	"testing"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/dsconfig/schema"
)

//go:embed dsconfig.json
var configSchemaJSON []byte

//go:generate go test -run TestPlugin -generateArtifacts
func TestPlugin(t *testing.T) {
	schema.RunPluginTests(t, schema.PluginUnderTest{
		ID:                "grafana-azure-data-explorer-datasource",
		ConfigSchemaJSON:  configSchemaJSON,
		SettingsJSONModel: models.DatasourceSettings{},
		SecureKeys:        []string{"azureClientSecret", "clientSecret"},
	})
}
