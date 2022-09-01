package adxcredentials

import (
	"testing"

	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFromDatasourceData(t *testing.T) {
	t.Run("ShouldReturnNil_WhenConfigurationEmpty", func(t *testing.T) {
		var data = map[string]interface{}{}
		var secureData = map[string]string{}

		result, err := FromDatasourceData(data, secureData)
		require.NoError(t, err)

		assert.Nil(t, result)
	})

	t.Run("should return client secret credentials when client secret configured", func(t *testing.T) {
		var data = map[string]interface{}{
			"azureCredentials": map[string]interface{}{
				"authType":   "clientsecret",
				"azureCloud": "AzureChinaCloud",
				"tenantId":   "TENANT-ID",
				"clientId":   "CLIENT-TD",
			},
		}
		var secureData = map[string]string{
			"azureClientSecret": "FAKE-SECRET",
		}

		result, err := FromDatasourceData(data, secureData)
		require.NoError(t, err)

		require.NotNil(t, result)
		assert.IsType(t, &azcredentials.AzureClientSecretCredentials{}, result)
		credential := (result).(*azcredentials.AzureClientSecretCredentials)

		assert.Equal(t, credential.AzureCloud, azsettings.AzureChina)
		assert.Equal(t, credential.TenantId, "TENANT-ID")
		assert.Equal(t, credential.ClientId, "CLIENT-TD")
		assert.Equal(t, credential.ClientSecret, "FAKE-SECRET")
	})

	t.Run("should return OBO credentials when OBO configured", func(t *testing.T) {
		var data = map[string]interface{}{
			"azureCredentials": map[string]interface{}{
				"authType":   "clientsecret-obo",
				"azureCloud": "AzureChinaCloud",
				"tenantId":   "TENANT-ID",
				"clientId":   "CLIENT-TD",
			},
			"oauthPassThru": true,
		}
		var secureData = map[string]string{
			"azureClientSecret": "FAKE-SECRET",
		}

		result, err := FromDatasourceData(data, secureData)
		require.NoError(t, err)

		require.NotNil(t, result)
		assert.IsType(t, &AzureClientSecretOboCredentials{}, result)
		credential := (result).(*AzureClientSecretOboCredentials)

		require.NotNil(t, credential.ClientSecretCredentials)
		assert.Equal(t, credential.ClientSecretCredentials.AzureCloud, azsettings.AzureChina)
		assert.Equal(t, credential.ClientSecretCredentials.TenantId, "TENANT-ID")
		assert.Equal(t, credential.ClientSecretCredentials.ClientId, "CLIENT-TD")
		assert.Equal(t, credential.ClientSecretCredentials.ClientSecret, "FAKE-SECRET")
	})

	t.Run("should return error when OBO configured but oauthPassThru not enabled", func(t *testing.T) {
		var data = map[string]interface{}{
			"azureCredentials": map[string]interface{}{
				"authType":   "clientsecret-obo",
				"azureCloud": "AzureChinaCloud",
				"tenantId":   "TENANT-ID",
				"clientId":   "CLIENT-TD",
			},
			//"oauthPassThru": false,
		}
		var secureData = map[string]string{
			"azureClientSecret": "FAKE-SECRET",
		}

		_, err := FromDatasourceData(data, secureData)
		assert.Error(t, err)
	})

	t.Run("should return client secret credentials when legacy client secret configuration present", func(t *testing.T) {
		var data = map[string]interface{}{
			"azureCloud": "azuremonitor",
			"tenantId":   "LEGACY-TENANT-ID",
			"clientId":   "LEGACY-CLIENT-ID",
		}
		var secureData = map[string]string{
			"clientSecret": "FAKE-LEGACY-SECRET",
		}

		result, err := FromDatasourceData(data, secureData)
		require.NoError(t, err)

		require.NotNil(t, result)
		assert.IsType(t, &azcredentials.AzureClientSecretCredentials{}, result)
		credential := (result).(*azcredentials.AzureClientSecretCredentials)

		assert.Equal(t, credential.AzureCloud, azsettings.AzurePublic)
		assert.Equal(t, credential.TenantId, "LEGACY-TENANT-ID")
		assert.Equal(t, credential.ClientId, "LEGACY-CLIENT-ID")
		assert.Equal(t, credential.ClientSecret, "FAKE-LEGACY-SECRET")
	})

	t.Run("should return OBO credentials when legacy OBO configuration present", func(t *testing.T) {
		var data = map[string]interface{}{
			"azureCloud":    "azuremonitor",
			"tenantId":      "LEGACY-TENANT-ID",
			"clientId":      "LEGACY-CLIENT-ID",
			"onBehalfOf":    true,
			"oauthPassThru": true,
		}
		var secureData = map[string]string{
			"clientSecret": "FAKE-LEGACY-SECRET",
		}

		result, err := FromDatasourceData(data, secureData)
		require.NoError(t, err)

		require.NotNil(t, result)
		assert.IsType(t, &AzureClientSecretOboCredentials{}, result)
		credential := (result).(*AzureClientSecretOboCredentials)

		require.NotNil(t, credential.ClientSecretCredentials)
		assert.Equal(t, credential.ClientSecretCredentials.AzureCloud, azsettings.AzurePublic)
		assert.Equal(t, credential.ClientSecretCredentials.TenantId, "LEGACY-TENANT-ID")
		assert.Equal(t, credential.ClientSecretCredentials.ClientId, "LEGACY-CLIENT-ID")
		assert.Equal(t, credential.ClientSecretCredentials.ClientSecret, "FAKE-LEGACY-SECRET")
	})

	t.Run("should return error when legacy OBO configuration present but oauthPassThru not enabled", func(t *testing.T) {
		var data = map[string]interface{}{
			"azureCloud": "azuremonitor",
			"tenantId":   "LEGACY-TENANT-ID",
			"clientId":   "LEGACY-CLIENT-ID",
			"onBehalfOf": true,
			//"oauthPassThru": false,
		}
		var secureData = map[string]string{
			"clientSecret": "FAKE-LEGACY-SECRET",
		}

		_, err := FromDatasourceData(data, secureData)
		assert.Error(t, err)
	})

	t.Run("should return client secret credentials when client secret configured even if legacy configuration present", func(t *testing.T) {
		var data = map[string]interface{}{
			"azureCredentials": map[string]interface{}{
				"authType":   "clientsecret",
				"azureCloud": "AzureChinaCloud",
				"tenantId":   "TENANT-ID",
				"clientId":   "CLIENT-TD",
			},
			"azureCloud":    "azuremonitor",
			"tenantId":      "LEGACY-TENANT-ID",
			"clientId":      "LEGACY-CLIENT-ID",
			"onBehalfOf":    true,
			"oauthPassThru": true,
		}
		var secureData = map[string]string{
			"azureClientSecret": "FAKE-SECRET",
			"clientSecret":      "FAKE-LEGACY-SECRET",
		}

		result, err := FromDatasourceData(data, secureData)
		require.NoError(t, err)

		require.NotNil(t, result)
		assert.IsType(t, &azcredentials.AzureClientSecretCredentials{}, result)
		credential := (result).(*azcredentials.AzureClientSecretCredentials)

		assert.Equal(t, credential.AzureCloud, azsettings.AzureChina)
		assert.Equal(t, credential.TenantId, "TENANT-ID")
		assert.Equal(t, credential.ClientId, "CLIENT-TD")
		assert.Equal(t, credential.ClientSecret, "FAKE-SECRET")
	})

	t.Run("should return error when credentials not supported even if legacy configuration present", func(t *testing.T) {
		var data = map[string]interface{}{
			"azureCredentials": map[string]interface{}{
				"authType":   "invalid",
				"azureCloud": "AzureChinaCloud",
				"tenantId":   "TENANT-ID",
				"clientId":   "CLIENT-TD",
			},
			"azureCloud":    "azuremonitor",
			"tenantId":      "LEGACY-TENANT-ID",
			"clientId":      "LEGACY-CLIENT-ID",
			"onBehalfOf":    true,
			"oauthPassThru": true,
		}
		var secureData = map[string]string{
			"azureClientSecret": "FAKE-SECRET",
			"clientSecret":      "FAKE-LEGACY-SECRET",
		}

		_, err := FromDatasourceData(data, secureData)
		assert.Error(t, err)
	})
}
