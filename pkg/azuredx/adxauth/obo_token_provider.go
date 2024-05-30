package adxauth

import (
	"context"
	"fmt"
	"net/http"

	"github.com/grafana/grafana-azure-sdk-go/v2/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/grafana/grafana-azure-sdk-go/v2/aztokenprovider"
	"github.com/grafana/grafana-azure-sdk-go/v2/azusercontext"
)

type onBehalfOfTokenProvider struct {
	aadClient aadClient
}

func NewOnBehalfOfAccessTokenProvider(settings *azsettings.AzureSettings, credentials azcredentials.AzureCredentials) (aztokenprovider.AzureTokenProvider, error) {
	var err error

	if settings == nil {
		err = fmt.Errorf("parameter 'settings' cannot be nil")
		return nil, err
	}
	if credentials == nil {
		err = fmt.Errorf("parameter 'credentials' cannot be nil")
		return nil, err
	}

	switch c := credentials.(type) {
	case *azcredentials.AzureClientSecretOboCredentials:
		aadClient, err := newAADClient(&c.ClientSecretCredentials, http.DefaultClient, settings)
		if err != nil {
			return nil, fmt.Errorf("invalid Azure configuration: %w", err)
		}
		return &onBehalfOfTokenProvider{
			aadClient: aadClient,
		}, nil
	default:
		err = fmt.Errorf("credentials of type '%s' not supported by the on-behalf-of token provider", c.AzureAuthType())
		return nil, err
	}
}

func (provider *onBehalfOfTokenProvider) GetAccessToken(ctx context.Context, scopes []string) (string, error) {
	if ctx == nil {
		err := fmt.Errorf("parameter 'ctx' cannot be nil")
		return "", err
	}

	if scopes == nil {
		err := fmt.Errorf("parameter 'scopes' cannot be nil")
		return "", err
	}

	currentUser, ok := azusercontext.GetCurrentUser(ctx)
	if !ok {
		err := fmt.Errorf("user context not configured")
		return "", err
	}

	if currentUser.IdToken == "" {
		err := fmt.Errorf("user context doesn't have ID token")
		return "", err
	}

	result, err := provider.aadClient.AcquireTokenOnBehalfOf(ctx, currentUser.IdToken, scopes)
	if err != nil {
		err = fmt.Errorf("unable to acquire access token: %w", err)
		return "", err
	}

	return result.AccessToken, nil
}
