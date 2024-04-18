package client

import (
	"fmt"
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
		scopeTmpl := cloud.Properties["resourceManager"] + "/.default"
		return []string{scopeTmpl}, nil
	}
}
