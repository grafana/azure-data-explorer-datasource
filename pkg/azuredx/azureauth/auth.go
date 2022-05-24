package azureauth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
	"github.com/grafana/grafana-azure-sdk-go/aztokenprovider"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
)

// ServiceCredentials provides authorization for cloud service usage.
type ServiceCredentials interface {
	ServicePrincipalAuthorization(ctx context.Context) (string, error)
	QueryDataAuthorization(ctx context.Context, req *backend.QueryDataRequest) (string, error)
}

type ServiceCredentialsImpl struct {
	OnBehalfOf   bool
	QueryTimeout time.Duration

	tokenProvider aztokenprovider.AzureTokenProvider
	tokenCache    *cache
	aadClient     aadClient
	scopes        []string
}

func NewServiceCredentials(settings *models.DatasourceSettings, azureSettings *azsettings.AzureSettings,
	httpClient *http.Client) (ServiceCredentials, error) {
	azureCloud, err := normalizeAzureCloud(settings.AzureCloud)
	if err != nil {
		return nil, fmt.Errorf("invalid Azure credentials: %w", err)
	}

	credentials := &azcredentials.AzureClientSecretCredentials{
		AzureCloud:   azureCloud,
		TenantId:     settings.TenantID,
		ClientId:     settings.ClientID,
		ClientSecret: settings.Secret,
	}

	tokenProvider, err := aztokenprovider.NewAzureAccessTokenProvider(azureSettings, credentials)
	if err != nil {
		return nil, fmt.Errorf("invalid Azure configuration: %w", err)
	}

	aadClient, err := newAADClient(credentials, httpClient)
	if err != nil {
		return nil, fmt.Errorf("invalid Azure configuration: %w", err)
	}

	scopes, err := getAzureScopes(credentials, settings.ClusterURL)
	if err != nil {
		return nil, fmt.Errorf("invalid Azure configuration: %w", err)
	}

	return &ServiceCredentialsImpl{
		OnBehalfOf:    settings.OnBehalfOf,
		QueryTimeout:  settings.QueryTimeout,
		tokenProvider: tokenProvider,
		tokenCache:    newCache(),
		aadClient:     aadClient,
		scopes:        scopes,
	}, nil
}

// ServicePrincipalAuthorization returns an HTTP Authorization-header value which
// represents the service principal.
func (c *ServiceCredentialsImpl) ServicePrincipalAuthorization(ctx context.Context) (string, error) {
	token, err := c.tokenProvider.GetAccessToken(ctx, c.scopes)
	if err != nil {
		return "", fmt.Errorf("service principal token unavailable: %w", err)
	}

	return "Bearer " + token, nil
}

// QueryDataAuthorization returns an HTTP Authorization-header value which
// represents the respective request.
func (c *ServiceCredentialsImpl) QueryDataAuthorization(ctx context.Context, req *backend.QueryDataRequest) (string, error) {
	if c.QueryTimeout != 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, c.QueryTimeout)
		defer cancel()
	}

	switch {
	case c.OnBehalfOf && e.features.IsEnabled(featuremgmt.FlagAdxOnBehalfOf):
		return c.queryDataOnBehalfOf(ctx, req)

	default:
		backend.Logger.Debug("using service principal token for data request")
		return c.ServicePrincipalAuthorization(ctx)
	}
}

func (c *ServiceCredentialsImpl) queryDataOnBehalfOf(ctx context.Context, req *backend.QueryDataRequest) (string, error) {
	user := req.PluginContext.User // do nil-check once for all
	if user == nil {
		return "", errors.New("non-user requests not permitted with on-behalf-of configuration")
	}

	// Azure requires an ID token (instead of an access token) for the exchange.
	userToken, ok := req.Headers["X-ID-Token"]
	if !ok {
		if _, ok := req.Headers["Authorization"]; !ok {
			return "", errors.New("system accounts are denied with on-behalf-of configuration")
		}

		backend.Logger.Error("ID token absent for data request; enable them on the Azure portal under: “App Registrations” → the respective application → “Manage” → “Authentication”", "user", user.Login)
		return "", errors.New("ID token absent for data request")
	}

	onBehalfOfToken, err := c.tokenCache.getOrSet(ctx, userToken, c.onBehalfOf)
	if err != nil {
		backend.Logger.Error(err.Error(), "user", user.Login)
		// Don't leak any context to the end-user.
		return "", errors.New("on-behalf-of token exchange failed for data request")
	}
	backend.Logger.Debug("aquired on-behalf-of token for data request")

	return "Bearer " + onBehalfOfToken, nil
}

func (c *ServiceCredentialsImpl) onBehalfOf(ctx context.Context, idToken string) (onBehalfOfToken string, expire time.Time, err error) {
	result, err := c.aadClient.AcquireTokenOnBehalfOf(ctx, idToken, c.scopes)
	if err != nil {
		return "", time.Time{}, err
	}
	return result.AccessToken, result.ExpiresOn.UTC(), nil
}
