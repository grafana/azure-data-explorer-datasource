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

## Current user authentication and background features


With current user authentication, every query runs as the Grafana user who is signed in. That works when someone is viewing a dashboard, but some Grafana features run in the background with no signed-in user. The main ones are **alerting**, **recorded queries**, and **reporting**. Because these features have no user to run as, they fail.


To keep them working, set up **fallback service credentials**.

## Fallback service credentials

Fallback credentials are a shared identity (an App Registration, managed identity, or workload identity) that the data source uses whenever a request has no signed-in user. When you enable them, background features such as alerting continue to work instead of failing. 

{{< admonition type="note" >}}
Requests that use the fallback run as this shared identity rather than as an individual user. As a result, they might return different data than an interactive query run by a specific user.
{{< /admonition >}}

To set up fallback credentials, complete the following three steps.

### 1. Enable fallback credentials in the Grafana configuration

In the `[azure]` section of your Grafana configuration file, enable fallback credentials. This setting is `true` by default when `user_identity_enabled` is set, but you can also set it explicitly.

```ini
[azure]
user_identity_enabled = true
user_identity_fallback_credentials_enabled = true
```

### 2. Enable ID forwarding

Grafana needs a way to distinguish a signed-in user's request from a background job. The `idForwarding` feature toggle provides that signal.

```ini
[feature_toggles]
idForwarding = true
```

Without `idForwarding`, Grafana can't recognize background requests (like alert evaluations) as having no user, so it never switches to the fallback, and those requests fail.

### 3. Add the credentials to the data source

In the data source settings:

1. Set **Authentication** to **Current User**.
1. Set **Fallback service credentials** to **Enabled**.
1. Select the identity type: **App Registration**, **Managed Identity**, or **Workload Identity**.
1. Enter the credential details for the identity type you selected.

## See also

- [User identity authentication in Azure Data Explorer and other Azure datasources](https://github.com/grafana/grafana/discussions/62994)
