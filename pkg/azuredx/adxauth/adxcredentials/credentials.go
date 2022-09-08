package adxcredentials

import (
	"fmt"

	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
)

const (
	AzureAuthClientSecretObo = "clientsecret-obo"
)

type AzureClientSecretOboCredentials struct {
	ClientSecretCredentials azcredentials.AzureClientSecretCredentials
}

func (credentials *AzureClientSecretOboCredentials) AzureAuthType() string {
	return AzureAuthClientSecretObo
}

func GetDefaultCredentials(settings *azsettings.AzureSettings) azcredentials.AzureCredentials {
	if settings.ManagedIdentityEnabled {
		return &azcredentials.AzureManagedIdentityCredentials{}
	} else {
		azureCloud := getDefaultAzureCloud(settings)
		return &azcredentials.AzureClientSecretCredentials{AzureCloud: azureCloud}
	}
}

func GetAzureCloud(settings *azsettings.AzureSettings, credentials azcredentials.AzureCredentials) (string, error) {
	switch c := credentials.(type) {
	case *azcredentials.AzureManagedIdentityCredentials:
		// In case of managed identity, the cloud is always same as where Grafana is hosted
		return getDefaultAzureCloud(settings), nil
	case *azcredentials.AzureClientSecretCredentials:
		return c.AzureCloud, nil
	case *AzureClientSecretOboCredentials:
		return c.ClientSecretCredentials.AzureCloud, nil
	default:
		err := fmt.Errorf("the Azure credentials of type '%s' not supported by Azure Data Explorer datasource", c.AzureAuthType())
		return "", err
	}
}

func getDefaultAzureCloud(settings *azsettings.AzureSettings) string {
	cloudName := settings.Cloud
	if cloudName == "" {
		return azsettings.AzurePublic
	}
	return cloudName
}
