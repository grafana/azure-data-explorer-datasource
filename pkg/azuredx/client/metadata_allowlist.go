package client

import (
	"net/url"
	"strings"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// trustedMetadataHosts restricts which hosts the plugin will contact for cluster
// auth metadata. It is derived from the datasource's trusted ADX endpoints and matches a host
// either exactly or by a leading "*." wildcard (e.g. "*.kusto.windows.net").
type trustedMetadataHosts []string

// newTrustedMetadataHosts derives the trusted hosts from the datasource's
// trusted endpoints. On error it returns nil (deny-all), so metadata resolution
// safely falls back to default scopes.
func newTrustedMetadataHosts(azureCloud string, azureSettings *azsettings.AzureSettings, dsSettings *models.DatasourceSettings) trustedMetadataHosts {
	endpoints, err := getTrustedEndpoints(azureCloud, azureSettings, dsSettings)
	if err != nil {
		backend.Logger.Warn("could not determine trusted endpoints for metadata client; falling back to default scopes", "error", err)
		return nil
	}
	return parseTrustedHosts(endpoints)
}

func parseTrustedHosts(endpoints []string) trustedMetadataHosts {
	hosts := make(trustedMetadataHosts, 0, len(endpoints))
	for _, endpoint := range endpoints {
		if u, err := url.Parse(endpoint); err == nil && u.Hostname() != "" {
			hosts = append(hosts, strings.ToLower(u.Hostname()))
		}
	}
	return hosts
}

// allows reports whether host matches any trusted entry: an exact match, or a
// "*.suffix" wildcard matching any subdomain of suffix.
func (t trustedMetadataHosts) allows(host string) bool {
	host = strings.ToLower(host)
	for _, entry := range t {
		if suffix, ok := strings.CutPrefix(entry, "*"); ok {
			// entry "*.kusto.windows.net" -> suffix ".kusto.windows.net"; the
			// host must be strictly longer so the bare suffix doesn't match.
			if len(host) > len(suffix) && strings.HasSuffix(host, suffix) {
				return true
			}
		} else if host == entry {
			return true
		}
	}
	return false
}
