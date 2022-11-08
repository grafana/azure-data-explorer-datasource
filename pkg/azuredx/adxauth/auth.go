package adxauth

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/adxauth/adxusercontext"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
	"github.com/grafana/grafana-azure-sdk-go/aztokenprovider"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// ServiceCredentials provides authorization for cloud service usage.
type ServiceCredentials interface {
	// TODO: GetServiceAccessToken needed for a workaround in CheckHealth
	GetServiceAccessToken(ctx context.Context) (string, error)
	GetAccessToken(ctx context.Context) (string, error)
}

type ServiceCredentialsImpl struct {
	QueryTimeout time.Duration

	tokenProvider aztokenprovider.AzureTokenProvider
	aadClient     aadClient
	scopes        []string
}

func NewServiceCredentials(settings *models.DatasourceSettings, azureSettings *azsettings.AzureSettings,
	credentials azcredentials.AzureCredentials) (ServiceCredentials, error) {
	var err error

	var tokenProvider aztokenprovider.AzureTokenProvider
	var aadClient aadClient = nil

	switch c := credentials.(type) {
	case *azcredentials.AzureClientSecretOboCredentials:
		// Special support for OBO authentication as it isn't supported by the SDK
		// Configure the service identity token provider with underlying client secret credentials
		tokenProvider, err = aztokenprovider.NewAzureAccessTokenProvider(azureSettings, &c.ClientSecretCredentials)
		if err != nil {
			return nil, fmt.Errorf("invalid Azure configuration: %w", err)
		}
		aadClient, err = newAADClient(&c.ClientSecretCredentials, http.DefaultClient)
		if err != nil {
			return nil, fmt.Errorf("invalid Azure configuration: %w", err)
		}
	default:
		tokenProvider, err = aztokenprovider.NewAzureAccessTokenProvider(azureSettings, c)
		if err != nil {
			return nil, fmt.Errorf("invalid Azure configuration: %w", err)
		}
	}

	scopes, err := getAzureScopes(azureSettings, credentials, settings.ClusterURL)
	if err != nil {
		return nil, fmt.Errorf("invalid Azure configuration: %w", err)
	}

	return &ServiceCredentialsImpl{
		QueryTimeout:  settings.QueryTimeout,
		tokenProvider: tokenProvider,
		aadClient:     aadClient,
		scopes:        scopes,
	}, nil
}

// GetServiceAccessToken returns access token for the service credentials
// TODO: GetServiceAccessToken needed for a workaround in CheckHealth
func (c *ServiceCredentialsImpl) GetServiceAccessToken(ctx context.Context) (string, error) {
	backend.Logger.Debug("using service principal token for data request")
	return c.tokenProvider.GetAccessToken(ctx, c.scopes)
}

// GetAccessToken returns access token for configured credentials
func (c *ServiceCredentialsImpl) GetAccessToken(ctx context.Context) (string, error) {
	if ctx == nil {
		err := fmt.Errorf("parameter 'ctx' cannot be nil")
		return "", err
	}

	if c.QueryTimeout != 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, c.QueryTimeout)
		defer cancel()
	}

	// Use AAD client if initialized (for OBO credentials)
	if c.aadClient != nil {
		return c.onBehalfOf(ctx)
	} else {
		// Service identity credentials
		return c.tokenProvider.GetAccessToken(ctx, c.scopes)
	}
}

func (c *ServiceCredentialsImpl) onBehalfOf(ctx context.Context) (string, error) {
	currentUser, ok := adxusercontext.GetCurrentUser(ctx)
	if !ok {
		err := fmt.Errorf("user context not configured")
		return "", err
	}

	if currentUser.IdToken == "" {
		err := fmt.Errorf("user context doesn't have ID token")
		return "", err
	}

	result, err := c.aadClient.AcquireTokenOnBehalfOf(ctx, currentUser.IdToken, c.scopes)
	if err != nil {
		backend.Logger.Error(err.Error(), "user", currentUser.User.Login)
		err = fmt.Errorf("unable to acquire access token for user '%s'", currentUser.User.Login)
		return "", err
	}

	return result.AccessToken, nil
}
