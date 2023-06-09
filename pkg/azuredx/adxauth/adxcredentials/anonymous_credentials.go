package adxcredentials

const (
	AzureAnonymousIdentity = "anonymous"
)

type AzureAnonymousCredentials struct {
}

func (credentials *AzureAnonymousCredentials) AzureAuthType() string {
	return AzureAnonymousIdentity
}
