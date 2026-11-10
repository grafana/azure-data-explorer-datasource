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

func TestScopeResolver_MetadataSuccess(t *testing.T) {
	tests := []struct {
		description            string
		kustoServiceResourceID string
		expectedScope          string
	}{
		{
			description:            "metadata returns public cloud audience",
			kustoServiceResourceID: "https://kusto.kusto.windows.net",
			expectedScope:          "https://kusto.kusto.windows.net/.default",
		},
		{
			description:            "metadata returns US Government audience",
			kustoServiceResourceID: "https://kusto.kusto.usgovcloudapi.net",
			expectedScope:          "https://kusto.kusto.usgovcloudapi.net/.default",
		},
		{
			description:            "metadata returns China audience",
			kustoServiceResourceID: "https://kusto.kusto.chinacloudapi.cn",
			expectedScope:          "https://kusto.kusto.chinacloudapi.cn/.default",
		},
		{
			description:            "metadata returns custom audience",
			kustoServiceResourceID: "https://kusto.custom.example.com",
			expectedScope:          "https://kusto.custom.example.com/.default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			server := metadataServer(t, tt.kustoServiceResourceID)
			defer server.Close()

			resolver := newScopeResolver(azsettings.AzurePublic, server.Client(), parseTrustedHosts([]string{server.URL}))

			req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, server.URL, nil)
			require.NoError(t, err)

			scopes, err := resolver(context.Background(), req)
			require.NoError(t, err)
			assert.Len(t, scopes, 1)
			assert.Equal(t, tt.expectedScope, scopes[0])
		})
	}
}

func TestScopeResolver_MetadataFailureFallsBack(t *testing.T) {
	failingServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer failingServer.Close()

	tests := []struct {
		description   string
		cloud         string
		expectedScope string
	}{
		{
			description:   "falls back to public cloud scope",
			cloud:         azsettings.AzurePublic,
			expectedScope: "https://kusto.kusto.windows.net/.default",
		},
		{
			description:   "falls back to US Government scope",
			cloud:         azsettings.AzureUSGovernment,
			expectedScope: "https://kusto.kusto.usgovcloudapi.net/.default",
		},
		{
			description:   "falls back to China scope",
			cloud:         azsettings.AzureChina,
			expectedScope: "https://kusto.kusto.chinacloudapi.cn/.default",
		},
		{
			// Unknown cloud falls back to the request's own cluster URL.
			description:   "falls back to cluster url for unknown cloud",
			cloud:         "Unknown",
			expectedScope: failingServer.URL + "/.default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			resolver := newScopeResolver(tt.cloud, failingServer.Client(), parseTrustedHosts([]string{failingServer.URL}))

			req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, failingServer.URL, nil)
			require.NoError(t, err)

			scopes, err := resolver(context.Background(), req)
			require.NoError(t, err)
			assert.Len(t, scopes, 1)
			assert.Equal(t, tt.expectedScope, scopes[0])
		})
	}
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
			scopes, err := getDefaultAdxScopes(tt.cloud, tt.clusterUrl)
			require.NoError(t, err)
			assert.Len(t, scopes, 1)
			assert.Equal(t, tt.expectedScope, scopes[0])
		})
	}
}
