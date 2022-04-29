package azureauth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/AzureAD/microsoft-authentication-library-for-go/apps/confidential"
	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
)

// Abstraction over confidential.Client from MSAL for Go
type aadClient interface {
	AcquireTokenOnBehalfOf(ctx context.Context, userAssertion string, scopes []string) (confidential.AuthResult, error)
}

func newAADClient(credentials *azcredentials.AzureClientSecretCredentials, httpClient *http.Client) (aadClient, error) {
	authority, err := resolveAuthorityForCloud(credentials.AzureCloud)
	if err != nil {
		return nil, fmt.Errorf("invalid Azure credentials: %w", err)
	}

	if !validTenantId(credentials.TenantId) {
		return nil, errors.New("invalid tenantId")
	}

	clientCredential, err := confidential.NewCredFromSecret(credentials.ClientSecret)
	if err != nil {
		return nil, err
	}

	authorityOpts := confidential.WithAuthority(runtime.JoinPaths(string(authority), credentials.TenantId))
	httpClientOPts := confidential.WithHTTPClient(httpClient)

	client, err := confidential.New(credentials.ClientId, clientCredential, authorityOpts, httpClientOPts)
	if err != nil {
		return nil, err
	}

	return client, nil
}

func resolveAuthorityForCloud(cloudName string) (azidentity.AuthorityHost, error) {
	// Known Azure clouds
	switch cloudName {
	case azsettings.AzurePublic:
		return azidentity.AzurePublicCloud, nil
	case azsettings.AzureChina:
		return azidentity.AzureChina, nil
	case azsettings.AzureUSGovernment:
		return azidentity.AzureGovernment, nil
	default:
		err := fmt.Errorf("the Azure cloud '%s' not supported", cloudName)
		return "", err
	}
}

func validTenantId(tenantId string) bool {
	match, err := regexp.MatchString("^[0-9a-zA-Z-.]+$", tenantId)
	if err != nil {
		return false
	}
	return match
}
