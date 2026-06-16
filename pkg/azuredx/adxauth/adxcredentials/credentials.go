package adxcredentials

import (
	"github.com/grafana/grafana-azure-sdk-go/v2/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
)

func GetDefaultCredentials(settings *azsettings.AzureSettings) azcredentials.AzureCredentials {
	if settings.ManagedIdentityEnabled {
		return &azcredentials.AzureManagedIdentityCredentials{}
	} else {
		return &azcredentials.AzureClientSecretCredentials{AzureCloud: settings.GetDefaultCloud()}
	}
}
