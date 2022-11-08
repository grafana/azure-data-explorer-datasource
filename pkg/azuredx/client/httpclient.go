package client

import (
	"fmt"
	"net/http"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/adxauth"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azhttpclient"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
)

func newHttpClient(settings *models.DatasourceSettings, azureSettings *azsettings.AzureSettings, credentials azcredentials.AzureCredentials) (*http.Client, error) {
	authOpts := azhttpclient.NewAuthOptions(azureSettings)

	// TODO: Check feature flag
	authOpts.AddTokenProvider(azcredentials.AzureAuthClientSecretObo, adxauth.NewOnBehalfOfAccessTokenProvider)

	scopes, err := getAdxScopes(azureSettings, credentials, settings.ClusterURL)
	if err != nil {
		return nil, err
	}
	authOpts.Scopes(scopes)

	clientOpts := httpclient.Options{}
	clientOpts.Timeouts.Timeout = settings.QueryTimeout
	azhttpclient.AddAzureAuthentication(&clientOpts, authOpts, credentials)

	httpClient, err := httpclient.NewProvider().New(clientOpts)
	if err != nil {
		return nil, fmt.Errorf("error creating http client: %w", err)
	}

	return httpClient, nil
}
