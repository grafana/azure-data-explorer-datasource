package client

import (
	"context"
	"fmt"
	"net/http"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/adxauth"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-azure-sdk-go/v2/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/v2/azhttpclient"
	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
)

func newHttpClientAzureCloud(ctx context.Context, instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings, azureSettings *azsettings.AzureSettings, credentials azcredentials.AzureCredentials) (*http.Client, error) {
	// Extract cloud from credentials
	azureCloud, err := azcredentials.GetAzureCloud(azureSettings, credentials)
	if err != nil {
		return nil, err
	}

	authOpts, err := getAuthOpts(azureSettings, dsSettings, azureCloud, true)
	if err != nil {
		return nil, err
	}

	scopes, err := getAdxScopes(azureCloud, dsSettings.ClusterURL)
	if err != nil {
		return nil, err
	}
	authOpts.Scopes(scopes)

	httpClient, err := getHttpClient(ctx, instanceSettings, dsSettings, authOpts, credentials)
	if err != nil {
		return nil, err
	}

	return httpClient, nil
}

func newHttpClientManagement(ctx context.Context, instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings, azureSettings *azsettings.AzureSettings, credentials azcredentials.AzureCredentials) (*http.Client, error) {
	// Extract cloud from credentials
	azureCloud, err := azcredentials.GetAzureCloud(azureSettings, credentials)
	if err != nil {
		return nil, err
	}

	authOpts, err := getAuthOpts(azureSettings, dsSettings, azureCloud, false)
	if err != nil {
		return nil, err
	}

	scopes, err := getARGScopes(azureCloud, azureSettings)
	if err != nil {
		return nil, err
	}
	authOpts.Scopes(scopes)

	httpClient, err := getHttpClient(ctx, instanceSettings, dsSettings, authOpts, credentials)
	if err != nil {
		return nil, err
	}

	return httpClient, nil
}

func getAuthOpts(azureSettings *azsettings.AzureSettings, dsSettings *models.DatasourceSettings, azureCloud string, userProvidedEndpoint bool) (*azhttpclient.AuthOptions, error) {
	authOpts := azhttpclient.NewAuthOptions(azureSettings)

	// Enables support for the experimental user-based authentication feature if the user_identity_enabled flag is set to true in the Grafana configuration
	authOpts.AllowUserIdentity()

	// TODO: #555 configure on-behalf-of authentication if enabled in AzureSettings
	authOpts.AddTokenProvider(azcredentials.AzureAuthClientSecretObo, adxauth.NewOnBehalfOfAccessTokenProvider)

	// Enforce only trusted Azure Data Explorer endpoints if enabled
	if userProvidedEndpoint && dsSettings.EnforceTrustedEndpoints {
		endpoints, err := getAdxEndpoints(azureCloud)
		if err != nil {
			return nil, err
		}
		err = authOpts.AllowedEndpoints(endpoints)
		if err != nil {
			return nil, err
		}
	}
	return authOpts, nil
}

func getHttpClient(ctx context.Context, instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings, authOpts *azhttpclient.AuthOptions, credentials azcredentials.AzureCredentials) (*http.Client, error) {
	clientOpts, err := instanceSettings.HTTPClientOptions(ctx)
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
