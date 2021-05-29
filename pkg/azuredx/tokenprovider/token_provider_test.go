package tokenprovider

import (
	"context"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/stretchr/testify/require"
)

const TestClientId = "3c882424-c381-45c0-a123-0a62ebc989dc"
const TestTenantId = "b931e0dd-f42c-444a-83a9-63de6f2d771a"
const TestClientSecret = "3093e953-91e1-48f4-9ad0-e8f750c38f93"
const Scope = "https://kusto.kusto.windows.net/.default"
const ExpectedToken string = "4cb83b87-0ffb-4abd-82f6-48a8c08afc53"

type tokenCacheFake struct{}

func (c *tokenCacheFake) GetAccessToken(_ context.Context, credential TokenCredential, scopes []string) (string, error) {
	err := credential.Init()
	if err != nil {
		return "", err
	}
	return ExpectedToken, nil
}

func (c *tokenCacheFake) Purge() {
	panic("not implemented")
}

func TestTokenProvider(t *testing.T) {
	ctx := context.Background()

	newClientSecretCredentialOriginal := newClientSecretCredential

	tokenCacheFake := &tokenCacheFake{}

	t.Cleanup(func() {
		newClientSecretCredential = newClientSecretCredentialOriginal
	})

	t.Run("should resolve public cloud host when nothing is specified", func(t *testing.T) {
		newClientSecretCredential = func(tenantID string, clientID string, clientSecret string, options *azidentity.ClientSecretCredentialOptions) (*azidentity.ClientSecretCredential, error) {
			require.Equal(t, TestClientId, clientID)
			require.Equal(t, TestTenantId, tenantID)
			require.Equal(t, TestClientSecret, clientSecret)
			require.Equal(t, azidentity.AzurePublicCloud, options.AuthorityHost)

			return &azidentity.ClientSecretCredential{}, nil
		}

		provider := NewAccessTokenProvider(tokenCacheFake, TestClientId, TestTenantId, "", TestClientSecret, []string{Scope})
		token, err := provider.GetAccessToken(ctx)
		require.Nil(t, err)
		require.Equal(t, ExpectedToken, token)
	})

	t.Run("should resolve public cloud host when public cloud is specified", func(t *testing.T) {
		newClientSecretCredential = func(tenantID string, clientID string, clientSecret string, options *azidentity.ClientSecretCredentialOptions) (*azidentity.ClientSecretCredential, error) {
			require.Equal(t, TestClientId, clientID)
			require.Equal(t, TestTenantId, tenantID)
			require.Equal(t, TestClientSecret, clientSecret)
			require.Equal(t, azidentity.AzurePublicCloud, options.AuthorityHost)

			return &azidentity.ClientSecretCredential{}, nil
		}

		provider := NewAccessTokenProvider(tokenCacheFake, TestClientId, TestTenantId, AzurePublic, TestClientSecret, []string{Scope})
		token, err := provider.GetAccessToken(ctx)
		require.Nil(t, err)
		require.Equal(t, ExpectedToken, token)
	})

	t.Run("should resolve china cloud host when china is specified", func(t *testing.T) {
		newClientSecretCredential = func(tenantID string, clientID string, clientSecret string, options *azidentity.ClientSecretCredentialOptions) (*azidentity.ClientSecretCredential, error) {
			require.Equal(t, TestClientId, clientID)
			require.Equal(t, TestTenantId, tenantID)
			require.Equal(t, TestClientSecret, clientSecret)
			require.Equal(t, azidentity.AzureChina, options.AuthorityHost)

			return &azidentity.ClientSecretCredential{}, nil
		}

		provider := NewAccessTokenProvider(tokenCacheFake, TestClientId, TestTenantId, AzureChina, TestClientSecret, []string{Scope})
		token, err := provider.GetAccessToken(ctx)
		require.Nil(t, err)
		require.Equal(t, ExpectedToken, token)
	})

	t.Run("should resolve us gov cloud host when us gov is specified", func(t *testing.T) {
		newClientSecretCredential = func(tenantID string, clientID string, clientSecret string, options *azidentity.ClientSecretCredentialOptions) (*azidentity.ClientSecretCredential, error) {
			require.Equal(t, TestClientId, clientID)
			require.Equal(t, TestTenantId, tenantID)
			require.Equal(t, TestClientSecret, clientSecret)
			require.Equal(t, azidentity.AzureGovernment, options.AuthorityHost)

			return &azidentity.ClientSecretCredential{}, nil
		}

		provider := NewAccessTokenProvider(tokenCacheFake, TestClientId, TestTenantId, AzureUSGovernment, TestClientSecret, []string{Scope})
		token, err := provider.GetAccessToken(ctx)
		require.Nil(t, err)
		require.Equal(t, ExpectedToken, token)
	})
}
