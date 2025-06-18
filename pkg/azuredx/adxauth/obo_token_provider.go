package adxauth

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/grafana/grafana-azure-sdk-go/v2/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/grafana/grafana-azure-sdk-go/v2/aztokenprovider"
	"github.com/grafana/grafana-azure-sdk-go/v2/azusercontext"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type onBehalfOfTokenProvider struct {
	aadClient aadClient
}

var defaultTransport = &http.Transport{
	Proxy: http.ProxyFromEnvironment,
	DialContext: defaultTransportDialContext(&net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}),
	ForceAttemptHTTP2:     true,
	MaxIdleConns:          100,
	IdleConnTimeout:       90 * time.Second,
	TLSHandshakeTimeout:   10 * time.Second,
	ExpectContinueTimeout: 1 * time.Second,
}

func defaultTransportDialContext(dialer *net.Dialer) func(context.Context, string, string) (net.Conn, error) {
	return dialer.DialContext
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
		httpClient := &http.Client{Transport: defaultTransport}
		aadClient, err := newAADClient(&c.ClientSecretCredentials, httpClient, settings)
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

	grafanaConfig := backend.GrafanaConfigFromContext(ctx)
	if !grafanaConfig.FeatureToggles().IsEnabled("adxOnBehalfOf") {
		err := fmt.Errorf("adxOnBehalfOf feature toggle is not enabled")
		return "", err
	}

	currentUser, ok := azusercontext.GetCurrentUser(ctx)
	if !ok {
		err := fmt.Errorf("user context not configured, are you signed in with Azure AD?")
		return "", err
	}

	if currentUser.IdToken == "" {
		err := fmt.Errorf("user context doesn't have ID token, are you signed in with Azure AD?")
		return "", err
	}

	result, err := provider.aadClient.AcquireTokenOnBehalfOf(ctx, currentUser.IdToken, scopes)
	if err != nil {
		err = fmt.Errorf("unable to acquire access token: %w", err)
		return "", err
	}

	return result.AccessToken, nil
}
