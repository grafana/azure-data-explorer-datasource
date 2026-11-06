package client

import (
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTrustedMetadataHosts_Allows(t *testing.T) {
	trusted := parseTrustedHosts([]string{
		"https://*.kusto.windows.net",
		"https://ade.loganalytics.io",
	})

	tests := []struct {
		name    string
		target  string
		allowed bool
	}{
		{name: "wildcard subdomain matches", target: "https://mycluster.kusto.windows.net", allowed: true},
		{name: "wildcard nested subdomain matches", target: "https://a.b.kusto.windows.net", allowed: true},
		{name: "wildcard is case-insensitive", target: "https://MyCluster.Kusto.Windows.Net", allowed: true},
		{name: "wildcard match ignores port", target: "https://mycluster.kusto.windows.net:8443", allowed: true},
		{name: "bare suffix does not match wildcard", target: "https://kusto.windows.net", allowed: false},
		{name: "exact host matches", target: "https://ade.loganalytics.io", allowed: true},
		{name: "exact host with subdomain does not match", target: "https://evil.ade.loganalytics.io", allowed: false},
		{name: "unrelated host is rejected", target: "https://management.azure.com", allowed: false},
		{name: "suffix-embedded impostor is rejected", target: "https://mycluster.kusto.windows.net.evil.com", allowed: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u, err := url.Parse(tt.target)
			require.NoError(t, err)
			assert.Equal(t, tt.allowed, trusted.allows(u.Hostname()))
		})
	}
}

func TestTrustedMetadataHosts_EmptyDeniesAll(t *testing.T) {
	assert.False(t, trustedMetadataHosts(nil).allows("mycluster.kusto.windows.net"))
	assert.False(t, parseTrustedHosts(nil).allows("mycluster.kusto.windows.net"))
}

func TestParseTrustedHosts_SkipsInvalidEndpoints(t *testing.T) {
	trusted := parseTrustedHosts([]string{"://missing-scheme", "https://*.kusto.windows.net"})
	assert.True(t, trusted.allows("mycluster.kusto.windows.net"))
	assert.Len(t, trusted, 1)
}
