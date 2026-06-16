package client

import (
	"testing"

	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetAzureScopes_KnownClouds(t *testing.T) {
	tests := []struct {
		description   string
		cloud         string
		clusterUrl    string
		expectedScope string
	}{
		{
			description:   "test public cloud",
			cloud:         azsettings.AzurePublic,
			clusterUrl:    "https://abc.northeurope.kusto.windows.net",
			expectedScope: "https://kusto.kusto.windows.net/.default",
		},
		{
			description:   "test US Government cloud - Texas",
			cloud:         azsettings.AzureUSGovernment,
			clusterUrl:    "https://abc.usgovtexas.kusto.usgovvirginia.net",
			expectedScope: "https://abc.usgovtexas.kusto.usgovvirginia.net/.default",
		},
		{
			description:   "test US Government cloud - Virginia",
			cloud:         azsettings.AzureUSGovernment,
			clusterUrl:    "https://abc.usgovtexas.kusto.usgovvirginia.net/",
			expectedScope: "https://abc.usgovtexas.kusto.usgovvirginia.net/.default",
		},
		{
			description:   "test China cloud",
			cloud:         azsettings.AzureChina,
			clusterUrl:    "https://abc.china.kusto.windows.net",
			expectedScope: "https://kusto.kusto.chinacloudapi.cn/.default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			scopes, err := getAdxScopes(tt.cloud, tt.clusterUrl)
			require.NoError(t, err)

			assert.Len(t, scopes, 1)
			assert.Equal(t, tt.expectedScope, scopes[0])
		})
	}
}

func TestGetAzureScopes_UnknownClouds(t *testing.T) {
	t.Run("should use the clusterUrl in the scope when cloud is unknown", func(t *testing.T) {
		clusterUrl := "https://abc.northeurope.unknown.net"

		scope, err := getAdxScopes("Unknown", clusterUrl)
		assert.NoError(t, err)
		assert.Equal(t, clusterUrl+"/.default", scope[0])
	})
}
