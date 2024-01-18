package client

import (
	"fmt"
	"strings"

	"github.com/grafana/grafana-azure-sdk-go/azsettings"
)

var (
	adxScopes = map[string]string{
		azsettings.AzurePublic:       "https://kusto.kusto.windows.net/.default",
		azsettings.AzureChina:        "https://kusto.kusto.chinacloudapi.cn/.default",
		azsettings.AzureUSGovernment: "{clusterUrl}/.default",
	}
	argScopes = map[string]string{
		azsettings.AzurePublic:       "https://management.azure.com/.default",
		azsettings.AzureChina:        "https://management.chinacloudapi.cn/.default",
		azsettings.AzureUSGovernment: "https://management.usgovcloudapi.net",
	}
)

func getAdxScopes(azureCloud string, clusterUrl string) ([]string, error) {
	// Get scopes for the given cloud
	if scopeTmpl, ok := adxScopes[azureCloud]; !ok {
		err := fmt.Errorf("the Azure cloud '%s' not supported by Azure Data Explorer datasource", azureCloud)
		return nil, err
	} else {
		// TODO: #356 Generalize generation of scopes for all clouds
		clusterUrl = strings.TrimSuffix(clusterUrl, "/")
		scopes := []string{strings.Replace(scopeTmpl, "{clusterUrl}", clusterUrl, 1)}
		return scopes, nil
	}
}

func getARGScopes(azureCloud string) ([]string, error) {
	// Get scopes for the given cloud
	if scopeTmpl, ok := argScopes[azureCloud]; !ok {
		err := fmt.Errorf("the Azure cloud '%s' not supported by Azure Data Explorer datasource", azureCloud)
		return nil, err
	} else {
		return []string{scopeTmpl}, nil
	}
}
