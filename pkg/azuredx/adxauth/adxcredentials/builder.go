package adxcredentials

import (
	"errors"
	"fmt"

	"github.com/grafana/grafana-azure-sdk-go/v2/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/grafana/grafana-plugin-sdk-go/data/utils/maputil"
)

func FromDatasourceData(data map[string]interface{}, secureData map[string]string) (azcredentials.AzureCredentials, error) {
	var credentials azcredentials.AzureCredentials
	var err error

	credentials, err = azcredentials.FromDatasourceData(data, secureData)
	if err != nil {
		return nil, err
	}

	// Fallback to legacy credentials format
	if credentials == nil {
		credentials, err = getFromLegacy(data, secureData)
		if err != nil {
			return nil, err
		}
	}

	// Current implementation of on-behalf-of authentication requires OAuth token pass-thru enabled
	switch credentials.(type) {
	case *azcredentials.AzureClientSecretOboCredentials:
		if err := ensureOnBehalfOfSupported(data); err != nil {
			return nil, err
		}
	}

	return credentials, err
}

func getFromLegacy(data map[string]interface{}, secureData map[string]string) (azcredentials.AzureCredentials, error) {
	legacyCloud, err := maputil.GetStringOptional(data, "azureCloud")
	if err != nil {
		return nil, err
	}
	cloud, err := resolveLegacyCloudName(legacyCloud)
	if err != nil {
		return nil, fmt.Errorf("invalid Azure credentials: %w", err)
	}
	tenantId, err := maputil.GetStringOptional(data, "tenantId")
	if err != nil {
		return nil, err
	}
	clientId, err := maputil.GetStringOptional(data, "clientId")
	if err != nil {
		return nil, err
	}
	clientSecret := secureData["clientSecret"]

	// If any of the required fields are not set then credentials are not configured
	if tenantId == "" || clientId == "" || clientSecret == "" {
		return nil, nil
	}

	clientSecretCredentials := azcredentials.AzureClientSecretCredentials{
		AzureCloud:   cloud,
		TenantId:     tenantId,
		ClientId:     clientId,
		ClientSecret: clientSecret,
	}

	onBehalfOf, err := maputil.GetBoolOptional(data, "onBehalfOf")
	if err != nil {
		return nil, err
	}

	var credentials azcredentials.AzureCredentials

	if onBehalfOf {
		credentials = &azcredentials.AzureClientSecretOboCredentials{
			ClientSecretCredentials: clientSecretCredentials,
		}
	} else {
		credentials = &clientSecretCredentials
	}

	return credentials, nil
}

func ensureOnBehalfOfSupported(data map[string]interface{}) error {
	oauthPassThru, err := maputil.GetBoolOptional(data, "oauthPassThru")
	if err != nil {
		return err
	} else if !oauthPassThru {
		return errors.New("oauthPassThru should be enabled for on-behalf-of authentication")
	} else {
		return nil
	}
}

// Legacy Azure cloud names used by the Azure Data Explorer datasource
const (
	azureMonitorPublic       = "azuremonitor"
	azureMonitorChina        = "chinaazuremonitor"
	azureMonitorUSGovernment = "govazuremonitor"
)

func resolveLegacyCloudName(cloudName string) (string, error) {
	switch cloudName {
	case azureMonitorPublic:
		return azsettings.AzurePublic, nil
	case azureMonitorChina:
		return azsettings.AzureChina, nil
	case azureMonitorUSGovernment:
		return azsettings.AzureUSGovernment, nil
	case "":
		return azsettings.AzurePublic, nil
	default:
		err := fmt.Errorf("the Azure cloud '%s' not supported by Azure Data Explorer datasource", cloudName)
		return "", err
	}
}
