package azureauth

import (
	"testing"

	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetAzureScopes_KnownClouds(t *testing.T) {
	tests := []struct {
		description   string
		credentials   *azcredentials.AzureClientSecretCredentials
		clusterUrl    string
		expectedScope string
	}{
		{
			description:   "test public cloud",
			credentials:   &azcredentials.AzureClientSecretCredentials{AzureCloud: azsettings.AzurePublic},
			clusterUrl:    "https://abc.northeurope.kusto.windows.net",
			expectedScope: "https://kusto.kusto.windows.net/.default",
		},
		{
			description:   "test US Government cloud - Texas",
			credentials:   &azcredentials.AzureClientSecretCredentials{AzureCloud: azsettings.AzureUSGovernment},
			clusterUrl:    "https://abc.usgovtexas.kusto.usgovvirginia.net",
			expectedScope: "https://abc.usgovtexas.kusto.usgovvirginia.net/.default",
		},
		{
			description:   "test US Government cloud - Virginia",
			credentials:   &azcredentials.AzureClientSecretCredentials{AzureCloud: azsettings.AzureUSGovernment},
			clusterUrl:    "https://abc.usgovtexas.kusto.usgovvirginia.net/",
			expectedScope: "https://abc.usgovtexas.kusto.usgovvirginia.net/.default",
		},
		{
			description:   "test China cloud",
			credentials:   &azcredentials.AzureClientSecretCredentials{AzureCloud: azsettings.AzureChina},
			clusterUrl:    "https://abc.china.kusto.windows.net",
			expectedScope: "https://kusto.kusto.chinacloudapi.cn/.default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			scopes, err := getAzureScopes(tt.credentials, tt.clusterUrl)
			require.NoError(t, err)

			assert.Len(t, scopes, 1)
			assert.Equal(t, tt.expectedScope, scopes[0])
		})
	}
}

func TestGetAzureScopes_UnknownClouds(t *testing.T) {
	t.Run("should fail when cloud is unknown", func(t *testing.T) {
		credentials := &azcredentials.AzureClientSecretCredentials{AzureCloud: "Unknown"}
		clusterUrl := "https://abc.northeurope.unknown.net"

		_, err := getAzureScopes(credentials, clusterUrl)
		assert.Error(t, err)
	})
}
