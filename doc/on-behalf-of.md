# On-Behalf-Of Authorization

**Note**: The feature is in beta, which means changes to the API and the user experience might occur.

⚠️ Only compatible with Grafana 8.3.4 or above.

Since 3.7.0, we provide OBO flow for Token Authorization. To be used, this feature flag needs to be enabled explicitly in Grafana's config:

```ini
[feature_toggles]
# On-Behalf-Of functionality for the ADX data source
adxOnBehalfOf = true
```

You can enable this feature by selecting the checkbox in the plugin configuration screen.
When provisioning, set the `oauthPassThru` property to `true` as shown in the following example.

```yaml
apiVersion: 1
datasources:
  - name: Azure Data Explorer
    type: grafana-azure-data-explorer-datasource
    access: proxy
    basicAuth: false
    editable: true
    jsonData:
      onBehalfOf: true
      oauthPassThru: true
      clientId: <your client UUID>
      clusterUrl: <your cluster URL>
      tenantId: <your tenant UUID>
      tlsAuth: false
      tlsAuthWithCACert: false
      defaultDatabase: <your default database>
    secureJsonData:
      clientSecret: <your client secret>
      tlsCACert: ''
      tlsClientCert: ''
      tlsClientKey: ''
    version: 1
```

We do not support on-behalf-of authorization for private clouds (like "chinaazuremonitor" or "govazuremonitor") at this time.

**Note**: Do not set up alerts when your data source is configured to use the on-behalf-of authorization. Alert rules will not work once the user who created the rule logs off from Grafana.

## Setup

1. Configure Grafana to use OAuth2 with Azure Active Directory as [documented](https://grafana.com/docs/grafana/latest/auth/azuread/). The `[auth.azuread]` `scopes` (or `$GF_AUTH_AZUREAD_SCOPES`) must contain “openid email profile”.

2. ID tokens must be enabled with a checkbox found on the [Azure portal](https://portal.azure.com/) under “App Registrations” → the respective application → “Manage” → “Authentication”.

3. In addition to the “Microsoft Graph” `User.Read`, a special “Azure Data Explorer” `user_impersonation` permission must be enabled on the [Azure portal](https://portal.azure.com/) under “App Registrations” → the respective application → “Manage” → “API permissions”.

4. Enable “Admin consent” under “App Registrations” → the respective application → “Security” → “Permissions”.
   Enabling “Admin consent” will grant consent on behalf of all users in the current tenant, ensuring the users will not be required to consent when using the application.

## Monitoring

Prometheus metrics are exposed on `/api/plugins/grafana-azure-data-explorer-datasource/metrics`. The `grafana_plugin_adx_obo_latency_seconds` histogram counts the number of requests, including the roundtrip times.

## Troubleshooting

Authorization errors are not propagated to the end user for security reasons. The Grafana logs will provide context instead.
