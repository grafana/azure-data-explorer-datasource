package azureauth

import (
	"fmt"

	"github.com/grafana/grafana-azure-sdk-go/azsettings"
)

// Azure cloud names used by the Azure Data Explorer datasource
const (
	azureMonitorPublic       = "azuremonitor"
	azureMonitorChina        = "chinaazuremonitor"
	azureMonitorUSGovernment = "govazuremonitor"
)

func normalizeAzureCloud(cloudName string) (string, error) {
	switch cloudName {
	case azureMonitorPublic:
		return azsettings.AzurePublic, nil
	case azureMonitorChina:
		return azsettings.AzureChina, nil
	case azureMonitorUSGovernment:
		return azsettings.AzureUSGovernment, nil
	default:
		err := fmt.Errorf("the cloud '%s' not supported", cloudName)
		return "", err
	}
}
