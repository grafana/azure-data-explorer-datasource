package client

import (
	"fmt"
	"strings"

	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
)

func getAdxScopes(azureCloud string, clusterUrl string, azureSettings *azsettings.AzureSettings) ([]string, error) {
	// Get scopes for the given cloud
	if cloud, err := azureSettings.GetCloud(azureCloud); err != nil {
		err := fmt.Errorf("the Azure cloud '%s' not supported by Azure Data Explorer datasource", azureCloud)
		return nil, err
	} else {
		scopeTmpl := "https://kusto" + cloud.Properties["azureDataExplorerSuffix"] + "/.default"
		clusterUrl = strings.TrimSuffix(clusterUrl, "/")

		// QUESTION
		// QUESTION: OLD CODE USED "{clusterUrl}" for AzureUSGovernment, but this no longer does - do we still need that functionality? BREAKING CHANGE???
		// QUESTION
		scopes := []string{strings.Replace(scopeTmpl, "{clusterUrl}", clusterUrl, 1)}
		return scopes, nil
	}
}

func getARGScopes(azureCloud string, azureSettings *azsettings.AzureSettings) ([]string, error) {
	// Get scopes for the given cloud
	if cloud, err := azureSettings.GetCloud(azureCloud); err != nil {
		err := fmt.Errorf("the Azure cloud '%s' not supported by Azure Data Explorer datasource", azureCloud)
		return nil, err
	} else {
		// QUESTION
		// QUESTION: OLD CODE DIDN"T USE "/.default" for AzureUSGovernment - WHY NOT?  WAS THIS A BUG?
		// QUESTION
		scopeTmpl := cloud.Properties["resourceManager"] + "/.default"
		return []string{scopeTmpl}, nil
	}
}
