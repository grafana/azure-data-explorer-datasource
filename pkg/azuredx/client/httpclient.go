package client

import (
	"fmt"
	"net/http"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/adxauth"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azhttpclient"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
)

func newHttpClient(instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings, azureSettings *azsettings.AzureSettings, credentials azcredentials.AzureCredentials) (*http.Client, error) {
	authOpts := azhttpclient.NewAuthOptions(azureSettings)

        // Enables support for the experimental user-based authentication feature if the user_identity_enabled flag is set to true in the Grafana configuration
	authOpts.AllowUserIdentity()

	// TODO: #555 configure on-behalf-of authentication if enabled in AzureSettings
	authOpts.AddTokenProvider(azcredentials.AzureAuthClientSecretObo, adxauth.NewOnBehalfOfAccessTokenProvider)

	scopes, err := getAdxScopes(azureSettings, credentials, dsSettings.ClusterURL)
	if err != nil {
		return nil, err
	}
	authOpts.Scopes(scopes)

	clientOpts, err := instanceSettings.HTTPClientOptions()
	if err != nil {
		return nil, fmt.Errorf("error creating http client: %w", err)
	}
	clientOpts.Timeouts.Timeout = dsSettings.QueryTimeout

	azhttpclient.AddAzureAuthentication(&clientOpts, authOpts, credentials)

	httpClient, err := httpclient.NewProvider().New(clientOpts)
	if err != nil {
		return nil, fmt.Errorf("error creating http client: %w", err)
	}

	return httpClient, nil
}
