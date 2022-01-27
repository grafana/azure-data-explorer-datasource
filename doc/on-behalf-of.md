# On-Behalf-Of Authorization

⚠️ Only compatible with Grafana 8.3.4 or later above.
⚠️ Grafana alert-rules do not work with on-behalf-of authorization.


## Setup

Configure Grafana to use OAuth2 with Azure Active Directory as [documented](https://grafana.com/docs/grafana/latest/auth/azuread/). The `[auth.azuread]` `scopes` (or `$GF_AUTH_AZUREAD_SCOPES`) must contain “openid email profile”.

ID tokens must be enabled with a checkbox found on the [Azure portal](https://portal.azure.com/) under “App Registrations” → the respective application → “Manage” → “Authentication”.

In addition to the “Microsoft Graph” `User.Read`, a special “Azure Data Explorer” `user_consent` permission must be enabled on the [Azure portal](https://portal.azure.com/)  under “App Registrations” → the respective application → “Manage” → “API permissions”.
