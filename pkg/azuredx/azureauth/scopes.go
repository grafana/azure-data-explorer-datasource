package azureauth

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

func getAzureScopes(credentials *azcredentials.AzureClientSecretCredentials, clusterUrl string) ([]string, error) {
	azureCloud := credentials.AzureCloud

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
