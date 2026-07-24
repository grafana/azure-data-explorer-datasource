package client

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func metadataServer(t *testing.T, kustoServiceResourceID string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprintf(w, `{"AzureAD":{"KustoServiceResourceId":"%s"}}`, kustoServiceResourceID)
	}))
}

func TestGetAdxScopes_MetadataSuccess(t *testing.T) {
	tests := []struct {
		description            string
		cloud                  string
		kustoServiceResourceID string
		expectedScope          string
	}{
		{
			description:            "metadata returns public cloud audience",
			cloud:                  azsettings.AzurePublic,
			kustoServiceResourceID: "https://kusto.kusto.windows.net",
			expectedScope:          "https://kusto.kusto.windows.net/.default",
		},
		{
			description:            "metadata returns US Government audience",
			cloud:                  azsettings.AzureUSGovernment,
			kustoServiceResourceID: "https://kusto.kusto.usgovcloudapi.net",
			expectedScope:          "https://kusto.kusto.usgovcloudapi.net/.default",
		},
		{
			description:            "metadata returns China audience",
			cloud:                  azsettings.AzureChina,
			kustoServiceResourceID: "https://kusto.kusto.chinacloudapi.cn",
			expectedScope:          "https://kusto.kusto.chinacloudapi.cn/.default",
		},
		{
			description:            "metadata returns custom audience",
			cloud:                  "CustomCloud",
			kustoServiceResourceID: "https://kusto.custom.example.com",
			expectedScope:          "https://kusto.custom.example.com/.default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			server := metadataServer(t, tt.kustoServiceResourceID)
			defer server.Close()

			scopes, err := getAdxScopes(context.Background(), server.Client(), tt.cloud, server.URL)
			require.NoError(t, err)
			assert.Len(t, scopes, 1)
			assert.Equal(t, tt.expectedScope, scopes[0])
		})
	}
}

func TestGetAdxScopes_FallbackToHardcodedScopes(t *testing.T) {
	failingServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer failingServer.Close()

	tests := []struct {
		description   string
		cloud         string
		clusterUrl    string
		expectedScope string
	}{
		{
			description:   "falls back to public cloud scope",
			cloud:         azsettings.AzurePublic,
			clusterUrl:    failingServer.URL,
			expectedScope: "https://kusto.kusto.windows.net/.default",
		},
		{
			description:   "falls back to US Government scope",
			cloud:         azsettings.AzureUSGovernment,
			clusterUrl:    failingServer.URL,
			expectedScope: "https://kusto.kusto.usgovcloudapi.net/.default",
		},
		{
			description:   "falls back to China scope",
			cloud:         azsettings.AzureChina,
			clusterUrl:    failingServer.URL,
			expectedScope: "https://kusto.kusto.chinacloudapi.cn/.default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			scopes, err := getAdxScopes(context.Background(), failingServer.Client(), tt.cloud, tt.clusterUrl)
			require.NoError(t, err)
			assert.Len(t, scopes, 1)
			assert.Equal(t, tt.expectedScope, scopes[0])
		})
	}
}

func TestGetAdxScopes_FallbackUnknownCloud(t *testing.T) {
	failingServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer failingServer.Close()

	t.Run("falls back to clusterUrl scope for unknown cloud", func(t *testing.T) {
		scopes, err := getAdxScopes(context.Background(), failingServer.Client(), "Unknown", failingServer.URL)
		require.NoError(t, err)
		assert.Len(t, scopes, 1)
		assert.Equal(t, failingServer.URL+"/.default", scopes[0])
	})
}

func TestGetAdxScopesFallback(t *testing.T) {
	tests := []struct {
		description   string
		cloud         string
		clusterUrl    string
		expectedScope string
	}{
		{
			description:   "public cloud",
			cloud:         azsettings.AzurePublic,
			clusterUrl:    "https://abc.northeurope.kusto.windows.net",
			expectedScope: "https://kusto.kusto.windows.net/.default",
		},
		{
			description:   "US Government cloud",
			cloud:         azsettings.AzureUSGovernment,
			clusterUrl:    "https://abc.usgovtexas.kusto.usgovvirginia.net",
			expectedScope: "https://kusto.kusto.usgovcloudapi.net/.default",
		},
		{
			description:   "US Government cloud with trailing slash",
			cloud:         azsettings.AzureUSGovernment,
			clusterUrl:    "https://abc.usgovtexas.kusto.usgovvirginia.net/",
			expectedScope: "https://kusto.kusto.usgovcloudapi.net/.default",
		},
		{
			description:   "China cloud",
			cloud:         azsettings.AzureChina,
			clusterUrl:    "https://abc.china.kusto.windows.net",
			expectedScope: "https://kusto.kusto.chinacloudapi.cn/.default",
		},
		{
			description:   "unknown cloud uses clusterUrl",
			cloud:         "Unknown",
			clusterUrl:    "https://abc.northeurope.unknown.net",
			expectedScope: "https://abc.northeurope.unknown.net/.default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			scopes, err := getAdxScopesFallback(tt.cloud, tt.clusterUrl)
			require.NoError(t, err)
			assert.Len(t, scopes, 1)
			assert.Equal(t, tt.expectedScope, scopes[0])
		})
	}
}
