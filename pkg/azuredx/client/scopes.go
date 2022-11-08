package client

import (
	"fmt"
	"strings"

	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
)

var (
	azureDataExplorerScopes = map[string]string{
		azsettings.AzurePublic:       "https://kusto.kusto.windows.net/.default",
		azsettings.AzureChina:        "https://kusto.kusto.chinacloudapi.cn/.default",
		azsettings.AzureUSGovernment: "{clusterUrl}/.default",
	}
)

func getAdxScopes(settings *azsettings.AzureSettings, credentials azcredentials.AzureCredentials, clusterUrl string) ([]string, error) {
	// Extract cloud from credentials
	azureCloud, err := azcredentials.GetAzureCloud(settings, credentials)
	if err != nil {
		return nil, err
	}
	// Get scopes for the given cloud
	if scopeTmpl, ok := azureDataExplorerScopes[azureCloud]; !ok {
		err := fmt.Errorf("the Azure cloud '%s' not supported by Azure Data Explorer datasource", azureCloud)
		return nil, err
	} else {
		// TODO: #356 Generalize generation of scopes for all clouds
		clusterUrl = strings.TrimSuffix(clusterUrl, "/")
		scopes := []string{strings.Replace(scopeTmpl, "{clusterUrl}", clusterUrl, 1)}
		return scopes, nil
	}
}
