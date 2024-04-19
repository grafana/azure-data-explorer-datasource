package adxauth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/AzureAD/microsoft-authentication-library-for-go/apps/confidential"
	"github.com/grafana/grafana-azure-sdk-go/v2/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
)

// Abstraction over confidential.Client from MSAL for Go
type aadClient interface {
	AcquireTokenOnBehalfOf(ctx context.Context, userAssertion string, scopes []string, options ...confidential.AcquireOnBehalfOfOption) (confidential.AuthResult, error)
}

func newAADClient(credentials *azcredentials.AzureClientSecretCredentials, httpClient *http.Client, settings *azsettings.AzureSettings) (aadClient, error) {
	authorityHost, err := resolveAuthorityForCloud(credentials.AzureCloud, settings)
	if err != nil {
		return nil, fmt.Errorf("invalid Azure credentials: %w", err)
	}

	if !validTenantId(credentials.TenantId) {
		return nil, errors.New("invalid tenantId")
	}

	authority := runtime.JoinPaths(authorityHost, credentials.TenantId)

	clientCredential, err := confidential.NewCredFromSecret(credentials.ClientSecret)
	if err != nil {
		return nil, err
	}

	httpClientOpts := confidential.WithHTTPClient(httpClient)
	client, err := confidential.New(authority, credentials.ClientId, clientCredential, httpClientOpts)
	if err != nil {
		return nil, err
	}

	return client, nil
}

func resolveAuthorityForCloud(cloudName string, settings *azsettings.AzureSettings) (string, error) {

	if cloud, err := settings.GetCloud(cloudName); err != nil {
		err := fmt.Errorf("the Azure cloud '%s' not supported", cloudName)
		return "", err
	} else {
		return cloud.AadAuthority, nil
	}
}

func validTenantId(tenantId string) bool {
	match, err := regexp.MatchString("^[0-9a-zA-Z-.]+$", tenantId)
	if err != nil {
		return false
	}
	return match
}
