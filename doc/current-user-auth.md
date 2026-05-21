# Current User Authorization

⚠️ Only compatible with Grafana 10.0 or above.

## Prerequisites

Current User Authorization only can work together with Azure AD Grafana authentication. Please refer to [Configure Azure AD/Entra ID OAuth authentication](https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/azuread/) documentation for complete guidance on setting up Azure AD Grafana authentication.

## Configuration

Assuming that Azure AD authentication has been already configured, for example, configuring Azure AD authentication using client secret:

```ini
[auth.azuread]
enabled = true

auth_url = https://login.microsoftonline.com/fd719c11-a91c-40fd-8379-1e6cd3c59568//oauth2/v2.0/authorize
token_url = https://login.microsoftonline.com/fd719c11-a91c-40fd-8379-1e6cd3c59568/oauth2/v2.0/token
client_authentication = # defaults to 'client_secret_post' (client secret)
client_id = f85aa887-490d-4fac-9306-9b99ad0aa31d
client_secret = 87808761-ff7b-492e-bb0d-5de2437ffa55
managed_identity_client_id =
federated_credential_audience =
```

Current User authentication can be enabled in the `[azure]` section of the Grafana config:

```ini
[azure]
user_identity_enabled = true
```

Optionally, it's possible to override the Azure AD authentication settings in the `[azure]` section of the Grafana config:

```ini
[azure]
user_identity_enabled = true

# Set custom settings
user_identity_client_authentication =
user_identity_client_id =
user_identity_client_secret =
user_identity_managed_identity_client_id =
user_identity_federated_credential_audience =
```

For example, it's possible to provide another AAD app for token exchange (On-Behalf-Of token request):

```ini
[azure]
user_identity_enabled = true

# Use different AAD app (OBO)
user_identity_client_id = 4fc34037-97bd-4e84-9db4-86238c78e32a
user_identity_client_secret = 4479f5a6-444c-4271-8790-60eeb42225ae
```

In another example, it's possible to customize the token endpoint:

```ini
[azure]
user_identity_enabled = true

user_identity_token_url = https://custom-token-endpoint/oauth2/v2.0/token
user_identity_client_id = 4fc34037-97bd-4e84-9db4-86238c78e32a
user_identity_client_secret = 4479f5a6-444c-4271-8790-60eeb42225ae
```

## Limitations

Current user authentication uses the identity of the signed-in Grafana user. Grafana features that query the data source without a user in context—such as **alerting**, **recorded queries**, and **reporting**—do not have a user identity available unless **fallback service credentials** are configured in Grafana (`user_identity_fallback_credentials_enabled` in the `[azure]` section). See the [Azure Monitor data source documentation](https://grafana.com/docs/grafana/latest/datasources/azure-monitor/configure/) for how fallback credentials work across Azure data sources.

## See also

- [User identity authentication in Azure Data Explorer and other Azure datasources](https://github.com/grafana/grafana/discussions/62994)
