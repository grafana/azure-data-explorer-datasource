package client

import (
	"testing"

	"github.com/grafana/grafana-azure-sdk-go/azsettings"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetAdxEndpoints_EmptyTrustedClusters(t *testing.T) {
	tests := []struct {
		description         string
		cloud               string
		trustedClustersUrls string
		expectedLastUrl     string
	}{
		{
			description:         "test public cloud",
			cloud:               azsettings.AzurePublic,
			trustedClustersUrls: "",
			expectedLastUrl:     "https://*.kusto.fabric.microsoft.com",
		},
		{
			description:         "test US Government cloud - Texas",
			cloud:               azsettings.AzureUSGovernment,
			trustedClustersUrls: "",
			expectedLastUrl:     "https://*.kustomfa.usgovcloudapi.net",
		},
		{
			description:         "test US Government cloud - Virginia",
			cloud:               azsettings.AzureUSGovernment,
			trustedClustersUrls: "",
			expectedLastUrl:     "https://*.kustomfa.usgovcloudapi.net",
		},
		{
			description:         "test China cloud",
			cloud:               azsettings.AzureChina,
			trustedClustersUrls: "",
			expectedLastUrl:     "https://*.playfab.cn",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			endpoints, err := getAdxEndpoints(tt.cloud, tt.trustedClustersUrls)
			require.NoError(t, err)

			assert.Len(t, endpoints, 22)
			assert.Equal(t, tt.expectedLastUrl, endpoints[len(endpoints)-1])
		})
	}
}

func TestGetAdxEndpoints_OneTrustedClusters(t *testing.T) {
	tests := []struct {
		description         string
		cloud               string
		trustedClustersUrls string
		expectedLastUrl     string
	}{
		{
			description:         "test public cloud",
			cloud:               azsettings.AzurePublic,
			trustedClustersUrls: "https://*.kusto.proxy.com",
			expectedLastUrl:     "https://*.kusto.proxy.com",
		},
		{
			description:         "test US Government cloud - Texas",
			cloud:               azsettings.AzureUSGovernment,
			trustedClustersUrls: "https://*.kusto.proxy.com",
			expectedLastUrl:     "https://*.kusto.proxy.com",
		},
		{
			description:         "test US Government cloud - Virginia",
			cloud:               azsettings.AzureUSGovernment,
			trustedClustersUrls: "https://*.kusto.proxy.com",
			expectedLastUrl:     "https://*.kusto.proxy.com",
		},
		{
			description:         "test China cloud",
			cloud:               azsettings.AzureChina,
			trustedClustersUrls: "https://*.kusto.proxy.com",
			expectedLastUrl:     "https://*.kusto.proxy.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			endpoints, err := getAdxEndpoints(tt.cloud, tt.trustedClustersUrls)
			require.NoError(t, err)

			assert.Len(t, endpoints, 23)
			assert.Equal(t, tt.expectedLastUrl, endpoints[len(endpoints)-1])
		})
	}
}

func TestGetAdxEndpoints_MoreThanOneTrustedClusters(t *testing.T) {
	tests := []struct {
		description         string
		cloud               string
		trustedClustersUrls string
		expectedLastUrl     string
	}{
		{
			description:         "test public cloud",
			cloud:               azsettings.AzurePublic,
			trustedClustersUrls: "https://*.kusto.proxy.com,https://*.kusto.proxy-2.com",
			expectedLastUrl:     "https://*.kusto.proxy-2.com",
		},
		{
			description:         "test US Government cloud - Texas",
			cloud:               azsettings.AzureUSGovernment,
			trustedClustersUrls: "https://*.kusto.proxy.com,https://*.kusto.proxy-2.com",
			expectedLastUrl:     "https://*.kusto.proxy-2.com",
		},
		{
			description:         "test US Government cloud - Virginia",
			cloud:               azsettings.AzureUSGovernment,
			trustedClustersUrls: "https://*.kusto.proxy.com,https://*.kusto.proxy-2.com",
			expectedLastUrl:     "https://*.kusto.proxy-2.com",
		},
		{
			description:         "test China cloud",
			cloud:               azsettings.AzureChina,
			trustedClustersUrls: "https://*.kusto.proxy.com,https://*.kusto.proxy-2.com",
			expectedLastUrl:     "https://*.kusto.proxy-2.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			endpoints, err := getAdxEndpoints(tt.cloud, tt.trustedClustersUrls)
			require.NoError(t, err)

			assert.Len(t, endpoints, 24)
			assert.Equal(t, tt.expectedLastUrl, endpoints[len(endpoints)-1])
		})
	}
}

func TestGetAdxEndpoints_UnknownClouds(t *testing.T) {
	t.Run("should fail when cloud is unknown", func(t *testing.T) {
		trustedClustersUrls := "https://abc.northeurope.unknown.net"

		_, err := getAdxEndpoints("Unknown", trustedClustersUrls)
		assert.Error(t, err)
	})
}
