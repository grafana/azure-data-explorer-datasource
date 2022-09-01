package adxcredentials

import (
	"errors"
	"fmt"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/adxauth/adxcredentials/internal/maputil"
	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
)

func FromDatasourceData(data map[string]interface{}, secureData map[string]string) (azcredentials.AzureCredentials, error) {
	var credentials azcredentials.AzureCredentials
	var err error

	// Authentication types specific to the Azure Data Explorer datasource
	if credentialsObj, err := maputil.GetMapOptional(data, "azureCredentials"); err != nil {
		return nil, err
	} else if credentialsObj != nil {
		credentials, err = getFromCredentialsObject(data, credentialsObj, secureData)
		if err != nil {
			return nil, err
		}
	}

	// Fallback to authentication types supported by SDK
	if credentials == nil {
		credentials, err = azcredentials.FromDatasourceData(data, secureData)
		if err != nil {
			return nil, err
		}
	}

	// Fallback to legacy credentials format
	if credentials == nil {
		credentials, err = getFromLegacy(data, secureData)
		if err != nil {
			return nil, err
		}
	}

	return credentials, err
}

func getFromCredentialsObject(data map[string]interface{}, credentialsObj map[string]interface{}, secureData map[string]string) (azcredentials.AzureCredentials, error) {
	authType, err := maputil.GetString(credentialsObj, "authType")
	if err != nil {
		return nil, err
	}

	switch authType {
	case AzureAuthClientSecretObo:
		if err := ensureOnBehalfOfSupported(data); err != nil {
			return nil, err
		}

		cloud, err := maputil.GetString(credentialsObj, "azureCloud")
		if err != nil {
			return nil, err
		}
		tenantId, err := maputil.GetString(credentialsObj, "tenantId")
		if err != nil {
			return nil, err
		}
		clientId, err := maputil.GetString(credentialsObj, "clientId")
		if err != nil {
			return nil, err
		}
		clientSecret := secureData["azureClientSecret"]

		credentials := &AzureClientSecretOboCredentials{
			ClientSecretCredentials: azcredentials.AzureClientSecretCredentials{
				AzureCloud:   cloud,
				TenantId:     tenantId,
				ClientId:     clientId,
				ClientSecret: clientSecret,
			},
		}
		return credentials, nil

	default:
		return nil, nil
	}
}

func getFromLegacy(data map[string]interface{}, secureData map[string]string) (azcredentials.AzureCredentials, error) {
	legacyCloud, err := maputil.GetStringOptional(data, "azureCloud")
	if err != nil {
		return nil, err
	}
	cloud, err := normalizeAzureCloud(legacyCloud)
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
		if err := ensureOnBehalfOfSupported(data); err != nil {
			return nil, err
		}

		credentials = &AzureClientSecretOboCredentials{
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
		return errors.New("oauthPassThru should be enabled for On-Behalf-Of authentication")
	} else {
		return nil
	}
}

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
	case "":
		return azsettings.AzurePublic, nil
	default:
		err := fmt.Errorf("the Azure cloud '%s' not supported by Azure Data Explorer datasource", cloudName)
		return "", err
	}
}
