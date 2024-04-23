package client

import (
	"fmt"
	"net/url"
	"path"
	"strings"

	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
)

var (
	adxScopes = map[string]string{
		azsettings.AzurePublic: "https://kusto.kusto.windows.net/.default",
		azsettings.AzureChina:  "https://kusto.kusto.chinacloudapi.cn/.default",
	}
)

func getAdxScopes(azureCloud string, clusterUrl string) ([]string, error) {
	// Get scopes for the given cloud
	scopeTmpl, ok := "", false
	if scopeTmpl, ok = adxScopes[azureCloud]; !ok {
		// AzurePublic and AzureChina use special scopes, other clouds will expect the clusterUrl in the scope
		// so fallback to this pattern for all others
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
