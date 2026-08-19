package client

import (
	"context"
	"fmt"
	"net/http"
	"time"

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

	metadataClient, err := newMetadataHTTPClient(ctx, instanceSettings)
	if err != nil {
		return nil, err
	}
	authOpts.SetScopeResolver(newScopeResolver(azureCloud, metadataClient))

	// Seed the default scopes for the datasource's own cluster. The per-request
	// ScopeResolver above supersedes these for every request (it falls back to
	// the target cluster's default scopes on error), so this only takes effect
	// if the SDK is ever changed to surface a resolver error instead of a
	// fallback. In that case these seeded scopes are the default cluster's
	// audience and may not match a cross-cluster query.
	scopes, err := getDefaultAdxScopes(azureCloud, dsSettings.ClusterURL)
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

	// Enables support for current user authentication when user_identity_enabled is set in Grafana configuration
	authOpts.AllowUserIdentity()

	// TODO: #555 configure on-behalf-of authentication if enabled in AzureSettings
	authOpts.AddTokenProvider(azcredentials.AzureAuthClientSecretObo, adxauth.NewOnBehalfOfAccessTokenProvider)

	// Enforce only trusted Azure Data Explorer endpoints if enabled
	if userProvidedEndpoint && dsSettings.EnforceTrustedEndpoints {
		endpoints, err := getAdxEndpoints(azureCloud, azureSettings)
		if err != nil {
			return nil, err
		}

		if dsSettings.AllowUserTrustedEndpoints && len(dsSettings.UserTrustedEndpoints) > 0 {
			endpoints = append(endpoints, dsSettings.UserTrustedEndpoints...)
		}

		err = authOpts.AllowedEndpoints(endpoints)
		if err != nil {
			return nil, err
		}
	}
	return authOpts, nil
}

func getHttpClient(ctx context.Context, instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings, authOpts *azhttpclient.AuthOptions, credentials azcredentials.AzureCredentials) (*http.Client, error) {
	return newHTTPClient(ctx, instanceSettings, dsSettings.QueryTimeout, func(clientOpts *httpclient.Options) {
		azhttpclient.AddAzureAuthentication(clientOpts, authOpts, credentials)
	})
}

// metadataTimeout bounds both the metadata HTTP client and the detached
// context used to fetch cluster auth metadata. It matches the datasource's
// prior metadata budget so a slow-but-reachable cluster still resolves rather
// than falling back to default scopes, while an unreachable endpoint fails within a bounded window.
// Repeated cost on a true outage is capped by negativeCacheTTL.
const metadataTimeout = 30 * time.Second

// newMetadataHTTPClient builds an unauthenticated client for the cluster's
// auth-metadata endpoint. It reuses the datasource's HTTP options (TLS, proxy,
// CA) so custom cluster configurations are honored, but with a shorter timeout.
func newMetadataHTTPClient(ctx context.Context, instanceSettings *backend.DataSourceInstanceSettings) (*http.Client, error) {
	return newHTTPClient(ctx, instanceSettings, metadataTimeout, nil)
}

// newHTTPClient constructs an *http.Client from the datasource's HTTP options
// with the given timeout. The optional configure hook can further mutate the
// options (e.g. to add authentication) before the client is built.
func newHTTPClient(ctx context.Context, instanceSettings *backend.DataSourceInstanceSettings, timeout time.Duration, configure func(*httpclient.Options)) (*http.Client, error) {
	clientOpts, err := instanceSettings.HTTPClientOptions(ctx)
	if err != nil {
		return nil, fmt.Errorf("error creating http client: %w", err)
	}
	clientOpts.Timeouts.Timeout = timeout

	if configure != nil {
		configure(&clientOpts)
	}

	httpClient, err := httpclient.NewProvider().New(clientOpts)
	if err != nil {
		return nil, fmt.Errorf("error creating http client: %w", err)
	}

	return httpClient, nil
}
