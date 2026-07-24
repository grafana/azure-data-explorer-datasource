package client

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"

	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

var (
	adxScopes = map[string]string{
		azsettings.AzurePublic:       "https://kusto.kusto.windows.net/.default",
		azsettings.AzureChina:        "https://kusto.kusto.chinacloudapi.cn/.default",
		azsettings.AzureUSGovernment: "https://kusto.kusto.usgovcloudapi.net/.default",
	}
)

func getAdxScopes(ctx context.Context, httpClient *http.Client, azureCloud string, clusterUrl string) ([]string, error) {
	metadata, err := fetchAuthMetadata(ctx, httpClient, clusterUrl)
	if err == nil {
		return []string{fmt.Sprintf("%s/.default", metadata.KustoServiceResourceID)}, nil
	}

	backend.Logger.Warn("failed to fetch auth metadata from cluster, falling back to hardcoded scopes", "cluster", clusterUrl, "error", err)
	return getAdxScopesFallback(azureCloud, clusterUrl)
}

func getAdxScopesFallback(azureCloud string, clusterUrl string) ([]string, error) {
	scopeTmpl, ok := "", false
	if scopeTmpl, ok = adxScopes[azureCloud]; !ok {
		scopeTmpl = "{clusterUrl}/.default"
	}

	clusterUrl = strings.TrimSuffix(clusterUrl, "/")
	scopes := []string{strings.Replace(scopeTmpl, "{clusterUrl}", clusterUrl, 1)}
	return scopes, nil
}

func getARGScopes(azureCloud string, azureSettings *azsettings.AzureSettings) ([]string, error) {
	// Get scopes for the given cloud
	if cloud, err := azureSettings.GetCloud(azureCloud); err != nil {
		err := fmt.Errorf("the Azure cloud '%s' not supported by Azure Data Explorer datasource", azureCloud)
		return nil, err
	} else {
		// Get scopes for the given cloud
		resourceId, ok := cloud.Properties["resourceManager"]
		if !ok {
			err := fmt.Errorf("the Azure cloud '%s' doesn't have configuration for 'resourceManager'", azureCloud)
			return nil, err
		}
		return audienceToScopes(resourceId)
	}
}

func audienceToScopes(audience string) ([]string, error) {
	resourceId, err := url.Parse(audience)
	if err != nil || resourceId.Scheme == "" || resourceId.Host == "" {
		err = fmt.Errorf("endpoint resource ID (audience) '%s' invalid", audience)
		return nil, err
	}

	resourceId.Path = path.Join(resourceId.Path, ".default")
	scopes := []string{resourceId.String()}
	return scopes, nil
}
