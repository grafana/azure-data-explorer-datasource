package tokenprovider

import (
	"context"
	"crypto/sha256"
	"fmt"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
)

var (
	// timeNow makes it possible to test usage of time
	timeNow = time.Now
)

type AccessTokenProvider struct {
	clientID  string
	tenantID  string
	authority string
	secret    string
	scopes    []string
	cache     ConcurrentTokenCache
}

var newClientSecretCredential = azidentity.NewClientSecretCredential

func NewAccessTokenProvider(cache ConcurrentTokenCache,
	clientId string, tenantId string, authority string, secret string, scopes []string) *AccessTokenProvider {
	return &AccessTokenProvider{
		clientID:  clientId,
		tenantID:  tenantId,
		authority: authority,
		secret:    secret,
		scopes:    scopes,
		cache:     cache,
	}
}

func (provider *AccessTokenProvider) GetAccessToken(ctx context.Context) (string, error) {
	credential := provider.getClientSecretCredential()
	accessToken, err := provider.cache.GetAccessToken(ctx, credential, provider.scopes)
	if err != nil {
		return "", err
	}

	return accessToken, nil
}

func (provider *AccessTokenProvider) getClientSecretCredential() TokenCredential {
	cloud := AuthorityBaseURL(provider.authority)
	return &clientSecretCredential{authority: cloud, tenantId: provider.tenantID, clientId: provider.clientID, clientSecret: provider.secret}
}

// AuthorityBaseURL returns the OAuth2 root, including tailing slash.
func AuthorityBaseURL(cloudName string) string {
	switch cloudName {
	case AzureChina:
		return azidentity.AzureChina
	case AzureUSGovernment:
		return azidentity.AzureGovernment
	default:
		return azidentity.AzurePublicCloud
	}
}

type clientSecretCredential struct {
	authority    string
	tenantId     string
	clientId     string
	clientSecret string
	credential   azcore.TokenCredential
}

func (c *clientSecretCredential) GetCacheKey() string {
	return fmt.Sprintf("%s|%s|%s|%s", c.authority, c.tenantId, c.clientId, hashSecret(c.clientSecret))
}

func (c *clientSecretCredential) Init() error {
	options := &azidentity.ClientSecretCredentialOptions{AuthorityHost: c.authority}
	if credential, err := newClientSecretCredential(c.tenantId, c.clientId, c.clientSecret, options); err != nil {
		return err
	} else {
		c.credential = credential
		return nil
	}
}

func (c *clientSecretCredential) GetAccessToken(ctx context.Context, scopes []string) (*AccessToken, error) {
	accessToken, err := c.credential.GetToken(ctx, azcore.TokenRequestOptions{Scopes: scopes})
	if err != nil {
		return nil, err
	}

	return &AccessToken{Token: accessToken.Token, ExpiresOn: accessToken.ExpiresOn}, nil
}

func hashSecret(secret string) string {
	hash := sha256.New()
	_, _ = hash.Write([]byte(secret))
	return fmt.Sprintf("%x", hash.Sum(nil))
}
