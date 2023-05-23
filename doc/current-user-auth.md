# Current User Authorization

**Note**: The feature is experimental, which means it may not work as expected, it may cause Grafana to behave in an unexpected way, and breaking changes may be introduced
in the future.

⚠️ Only compatible with Grafana 10.0 or above.

## Prerequisites

Current User Authorization only can work together with Azure AD Grafana authentication.

## Configuration

Assuming that Azure AD authentication has been already configured, for example:

```ini
[auth.azuread]
enabled = true

auth_url = https://login.microsoftonline.com/fd719c11-a91c-40fd-8379-1e6cd3c59568//oauth2/v2.0/authorize
token_url = https://login.microsoftonline.com/fd719c11-a91c-40fd-8379-1e6cd3c59568/oauth2/v2.0/token
client_id = f85aa887-490d-4fac-9306-9b99ad0aa31d
client_secret = 87808761-ff7b-492e-bb0d-5de2437ffa55
```

Current User authentication can be enabled in the `[azure]` section of the Grafana config:

```ini
[azure]
user_identity_enabled = true
```

Optionally, it's possible to provide another AAD app for token exchange (On-Behalf-Of token request):

```ini
[azure]
user_identity_enabled = true

# Use different AAD app (OBO)
user_identity_client_id = 4fc34037-97bd-4e84-9db4-86238c78e32a
user_identity_client_secret = 4479f5a6-444c-4271-8790-60eeb42225ae
```

Also, it's possible to customize the token endpoint:

```ini
[azure]
user_identity_enabled = true

user_identity_token_url = https://custom-token-endpoint/oauth2/v2.0/token
user_identity_client_id = 4fc34037-97bd-4e84-9db4-86238c78e32a
user_identity_client_secret = 4479f5a6-444c-4271-8790-60eeb42225ae
```

## See also

- [User identity authentication in Azure Data Explorer and other Azure datasources](https://github.com/grafana/grafana/discussions/62994)
