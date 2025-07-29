package client

import (
	"context"
	"testing"
	"time"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-azure-sdk-go/v2/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/v2/azhttpclient"
	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewHttpClientAzureCloud(t *testing.T) {
	tests := []struct {
		name        string
		azureCloud  string
		clusterURL  string
		expectError bool
		setupMocks  func() (*backend.DataSourceInstanceSettings, *models.DatasourceSettings, *azsettings.AzureSettings, azcredentials.AzureCredentials)
	}{
		{
			name:        "successful creation with public cloud",
			azureCloud:  azsettings.AzurePublic,
			clusterURL:  "https://test.kusto.windows.net",
			expectError: false,
			setupMocks: func() (*backend.DataSourceInstanceSettings, *models.DatasourceSettings, *azsettings.AzureSettings, azcredentials.AzureCredentials) {
				instanceSettings := &backend.DataSourceInstanceSettings{
					ID:       1,
					Name:     "test-datasource",
					URL:      "https://test.kusto.windows.net",
					JSONData: []byte(`{}`),
				}

				dsSettings := &models.DatasourceSettings{
					ClusterURL:              "https://test.kusto.windows.net",
					QueryTimeout:            time.Minute,
					EnforceTrustedEndpoints: false,
				}

				azureSettings := &azsettings.AzureSettings{
					Cloud: azsettings.AzurePublic,
				}

				credentials := &azcredentials.AzureManagedIdentityCredentials{}

				return instanceSettings, dsSettings, azureSettings, credentials
			},
		},
		{
			name:        "successful creation with US Government cloud",
			azureCloud:  azsettings.AzureUSGovernment,
			clusterURL:  "https://test.usgovtexas.kusto.usgovvirginia.net",
			expectError: false,
			setupMocks: func() (*backend.DataSourceInstanceSettings, *models.DatasourceSettings, *azsettings.AzureSettings, azcredentials.AzureCredentials) {
				instanceSettings := &backend.DataSourceInstanceSettings{
					ID:       1,
					Name:     "test-datasource",
					URL:      "https://test.usgovtexas.kusto.usgovvirginia.net",
					JSONData: []byte(`{}`),
				}

				dsSettings := &models.DatasourceSettings{
					ClusterURL:              "https://test.usgovtexas.kusto.usgovvirginia.net",
					QueryTimeout:            time.Minute,
					EnforceTrustedEndpoints: false,
				}

				azureSettings := &azsettings.AzureSettings{
					Cloud: azsettings.AzureUSGovernment,
				}

				credentials := &azcredentials.AzureManagedIdentityCredentials{}

				return instanceSettings, dsSettings, azureSettings, credentials
			},
		},
		{
			name:        "with trusted endpoints enforcement",
			azureCloud:  azsettings.AzurePublic,
			clusterURL:  "https://test.kusto.windows.net",
			expectError: false,
			setupMocks: func() (*backend.DataSourceInstanceSettings, *models.DatasourceSettings, *azsettings.AzureSettings, azcredentials.AzureCredentials) {
				instanceSettings := &backend.DataSourceInstanceSettings{
					ID:       1,
					Name:     "test-datasource",
					URL:      "https://test.kusto.windows.net",
					JSONData: []byte(`{}`),
				}

				dsSettings := &models.DatasourceSettings{
					ClusterURL:                "https://test.kusto.windows.net",
					QueryTimeout:              time.Minute,
					EnforceTrustedEndpoints:   true,
					AllowUserTrustedEndpoints: false,
				}

				azureSettings := &azsettings.AzureSettings{
					Cloud: azsettings.AzurePublic,
				}

				credentials := &azcredentials.AzureManagedIdentityCredentials{}

				return instanceSettings, dsSettings, azureSettings, credentials
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			instanceSettings, dsSettings, azureSettings, credentials := tt.setupMocks()

			client, err := newHttpClientAzureCloud(context.Background(), instanceSettings, dsSettings, azureSettings, credentials)

			if tt.expectError {
				require.Error(t, err)
				assert.Nil(t, client)
			} else {
				require.NoError(t, err)
				assert.NotNil(t, client)
			}
		})
	}
}

func TestNewHttpClientManagement(t *testing.T) {
	tests := []struct {
		name        string
		azureCloud  string
		expectError bool
		setupMocks  func() (*backend.DataSourceInstanceSettings, *models.DatasourceSettings, *azsettings.AzureSettings, azcredentials.AzureCredentials)
	}{
		{
			name:        "successful creation of management client",
			azureCloud:  azsettings.AzurePublic,
			expectError: false,
			setupMocks: func() (*backend.DataSourceInstanceSettings, *models.DatasourceSettings, *azsettings.AzureSettings, azcredentials.AzureCredentials) {
				instanceSettings := &backend.DataSourceInstanceSettings{
					ID:       1,
					Name:     "test-datasource",
					URL:      "https://test.kusto.windows.net",
					JSONData: []byte(`{}`),
				}

				dsSettings := &models.DatasourceSettings{
					ClusterURL:   "https://test.kusto.windows.net",
					QueryTimeout: time.Minute,
				}

				azureSettings := &azsettings.AzureSettings{
					Cloud: azsettings.AzurePublic,
				}

				credentials := &azcredentials.AzureManagedIdentityCredentials{}

				return instanceSettings, dsSettings, azureSettings, credentials
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			instanceSettings, dsSettings, azureSettings, credentials := tt.setupMocks()

			client, err := newHttpClientManagement(context.Background(), instanceSettings, dsSettings, azureSettings, credentials)

			if tt.expectError {
				require.Error(t, err)
				assert.Nil(t, client)
			} else {
				require.NoError(t, err)
				assert.NotNil(t, client)
			}
		})
	}
}

func TestGetAuthOpts(t *testing.T) {
	tests := []struct {
		name                 string
		azureCloud           string
		userProvidedEndpoint bool
		dsSettings           *models.DatasourceSettings
		expectError          bool
		expectedEndpoints    []string
		customClouds         []*azsettings.AzureCloudSettings
	}{
		{
			name:                 "basic auth options without endpoint enforcement",
			azureCloud:           azsettings.AzurePublic,
			userProvidedEndpoint: false,
			dsSettings: &models.DatasourceSettings{
				ClusterURL:              "https://test.kusto.windows.net",
				EnforceTrustedEndpoints: false,
			},
			expectError:  false,
			customClouds: nil,
		},
		{
			name:                 "auth options with trusted endpoints enforcement",
			azureCloud:           azsettings.AzurePublic,
			userProvidedEndpoint: true,
			dsSettings: &models.DatasourceSettings{
				ClusterURL:              "https://test.kusto.windows.net",
				EnforceTrustedEndpoints: true,
			},
			expectError:  false,
			customClouds: nil,
		},
		{
			name:                 "auth options with trusted endpoints and user endpoints",
			azureCloud:           azsettings.AzurePublic,
			userProvidedEndpoint: true,
			dsSettings: &models.DatasourceSettings{
				ClusterURL:                "https://test.kusto.windows.net",
				EnforceTrustedEndpoints:   true,
				AllowUserTrustedEndpoints: true,
				UserTrustedEndpoints:      []string{"https://custom.endpoint.com", "https://another.endpoint.com"},
			},
			expectError:  false,
			customClouds: nil,
		},
		{
			name:                 "auth options with unsupported cloud",
			azureCloud:           "unsupported-cloud",
			userProvidedEndpoint: true,
			dsSettings: &models.DatasourceSettings{
				ClusterURL:              "https://test.kusto.windows.net",
				EnforceTrustedEndpoints: true,
			},
			expectError:  true,
			customClouds: nil,
		},
		{
			name:                 "auth options with unsupported cloud and custom cloud",
			azureCloud:           "unsupported-cloud",
			userProvidedEndpoint: true,
			dsSettings: &models.DatasourceSettings{
				ClusterURL:              "https://test.kusto.windows.net",
				EnforceTrustedEndpoints: true,
			},
			expectError: true,
			customClouds: []*azsettings.AzureCloudSettings{
				{
					Name:        "customCloud",
					DisplayName: "Custom Cloud",
					Properties: map[string]string{
						"azureDataExplorerSuffix": ".custom.net",
					},
				},
			},
		},
		{
			name:                 "auth options with custom cloud (not selected)",
			azureCloud:           azsettings.AzurePublic,
			userProvidedEndpoint: true,
			dsSettings: &models.DatasourceSettings{
				ClusterURL:              "https://test.kusto.windows.net",
				EnforceTrustedEndpoints: true,
			},
			expectError: false,
			customClouds: []*azsettings.AzureCloudSettings{
				{
					Name:        "customCloud",
					DisplayName: "Custom Cloud",
					Properties: map[string]string{
						"azureDataExplorerSuffix": ".custom.net",
					},
				},
			},
		},
		{
			name:                 "auth options with custom cloud (selected)",
			azureCloud:           "customCloud",
			userProvidedEndpoint: true,
			dsSettings: &models.DatasourceSettings{
				ClusterURL:              "https://test.custom.net",
				EnforceTrustedEndpoints: true,
			},
			expectError: false,
			customClouds: []*azsettings.AzureCloudSettings{
				{
					Name:        "customCloud",
					DisplayName: "Custom Cloud",
					Properties: map[string]string{
						"azureDataExplorerSuffix": ".custom.net",
					},
				},
			},
		},
		{
			name:                 "malformed custom cloud url",
			azureCloud:           "customCloud",
			userProvidedEndpoint: true,
			dsSettings: &models.DatasourceSettings{
				ClusterURL:              "https://test.custom.net",
				EnforceTrustedEndpoints: true,
			},
			expectError: true,
			customClouds: []*azsettings.AzureCloudSettings{
				{
					Name:        "customCloud",
					DisplayName: "Custom Cloud",
					Properties: map[string]string{
						"azureDataExplorerSuffix": "...fai l.html",
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			azureSettings := &azsettings.AzureSettings{
				Cloud:           tt.azureCloud,
				CustomCloudList: tt.customClouds,
			}

			authOpts, err := getAuthOpts(azureSettings, tt.dsSettings, tt.azureCloud, tt.userProvidedEndpoint)

			if tt.expectError {
				require.Error(t, err)
				assert.Nil(t, authOpts)
			} else {
				require.NoError(t, err)
				assert.NotNil(t, authOpts)
				assert.IsType(t, &azhttpclient.AuthOptions{}, authOpts)
			}
		})
	}
}
