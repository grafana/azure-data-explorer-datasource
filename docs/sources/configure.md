---
description: Configure the Azure Data Explorer data source plugin for Grafana, including authentication, provisioning, and trusted endpoints.
keywords:
  - grafana
  - azure
  - azure data explorer
  - kusto
  - configuration
  - authentication
  - provisioning
  - terraform
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Configure
title: Configure the Azure Data Explorer data source
weight: 100
review_date: 2026-07-17
---

# Configure the Azure Data Explorer data source

This document explains how to configure the Azure Data Explorer data source in Grafana, including the available authentication methods, provisioning, and security options.

## Before you begin

Before you configure the data source, ensure you have the following:

- **Installed plugin:** The Azure Data Explorer plugin installed and activated. For installation, licensing, and upgrade steps, refer to [Install and upgrade the Azure Data Explorer data source plugin](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/install/).
- **Grafana permissions:** The `Organization administrator` role to add and configure data sources.
- **Azure Data Explorer resources:** An Azure Data Explorer cluster and database.
- **Microsoft Entra identity:** A Microsoft Entra application, managed identity, or workload identity with viewer access to your database.

## Key concepts

If you're new to Azure Data Explorer, these terms are used throughout the configuration:

| Term | Description |
|------|-------------|
| **Microsoft Entra ID** | Microsoft's cloud identity service, formerly Azure Active Directory (AAD), used to authenticate to Azure Data Explorer. |
| **App Registration** | A Microsoft Entra application identity with a client ID and secret that an application uses to authenticate. |
| **Service principal** | The identity created for an App Registration within a specific tenant, to which you grant database access. |
| **Managed identity** | An automatically managed Microsoft Entra identity for applications running on Azure resources, with no secrets to manage. |
| **Workload identity** | A federated identity that lets workloads running outside Azure authenticate without a stored secret. |

## Add the data source

To add the Azure Data Explorer data source:

1. Click **Connections** in the left-side menu.
1. Click **Add new connection**.
1. Type `Azure Data Explorer` in the search bar.
1. Select **Azure Data Explorer Datasource**.
1. Click **Add new data source**.

## Configure the connection

Enter a name for the data source, then configure the cluster connection:

| Setting | Description |
|---------|-------------|
| **Default cluster URL (Optional)** | The default cluster URL for the data source, such as `https://yourcluster.kusto.windows.net`. You can select a different cluster in each query, so this field is optional. |

## Authentication

The Azure Data Explorer data source supports several authentication methods. Choose the method that matches your deployment.

| Method | Best for | Grafana Cloud | Supports alerting | Server configuration required |
|--------|----------|---------------|-------------------|-------------------------------|
| **App Registration** | Any deployment | Yes | Yes | No |
| **Managed Identity** | Azure-hosted Grafana | No | Yes | Yes |
| **Workload Identity** | Federated workloads | No | Yes | Yes |
| **Current User** | Per-user access control | Yes | With fallback credentials | Yes |
| **On-Behalf-Of** | Per-user token exchange (Beta) | No | No | Yes |

### App Registration

App Registration authentication uses a Microsoft Entra application and client secret. It works in every deployment, including Grafana Cloud.

To create a Microsoft Entra application and service principal, follow the Microsoft guide [Create a Microsoft Entra application and service principal that can access resources](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal). Alternatively, use the Azure CLI:

```bash
az ad sp create-for-rbac -n "http://url.to.your.grafana:3000"
```

The command returns credentials similar to the following:

```json
{
  "appId": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "displayName": "azure-cli-2018-09-20-13-42-58",
  "name": "http://url.to.your.grafana:3000",
  "password": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "tenant": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
}
```

Assign the `Reader` role to the service principal and remove the `Contributor` role:

```bash
az role assignment create --assignee <your appId> --role Reader
az role assignment delete --assignee <your appId> --role Contributor
```

Grant the application viewer access to your database using the `.add` management command. The argument contains the client ID and tenant ID separated by a semicolon:

```kusto
.add database <your database> viewers ('aadapp=<your client id>;<your tenant id>')
```

Enter the following fields in the data source settings:

| Setting | Description |
|---------|-------------|
| **Directory (tenant) ID** | The Microsoft Entra directory (tenant) ID. |
| **Application (client) ID** | The App Registration application (client) ID. |
| **Client Secret** | The client secret generated for the App Registration. |

### Managed Identity

Managed Identity authentication uses a Microsoft Entra identity that Azure manages automatically, so there are no secrets to store. It's available only when Grafana runs on an Azure resource and managed identities are enabled in the Grafana configuration.

To enable managed identities, set the following in the `[azure]` section of your Grafana configuration file:

```ini
[azure]
managed_identity_enabled = true
```

When enabled, select **Managed Identity** as the authentication type in the data source settings. Grant the managed identity viewer access to your database using the `.add` management command.

### Workload Identity

Workload Identity authentication uses federated credentials, which lets workloads authenticate without a stored secret. It's available only when workload identity is enabled in the Grafana configuration.

To enable workload identity, set the following in the `[azure]` section of your Grafana configuration file:

```ini
[azure]
workload_identity_enabled = true
```

When enabled, select **Workload Identity** as the authentication type in the data source settings.

### Current User

Current User authentication runs each query as the Grafana user who is signed in, so access follows each user's own Azure permissions. It requires Microsoft Entra (Azure AD) authentication for Grafana. For complete guidance, refer to [Configure Azure AD/Entra ID OAuth authentication](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-security/configure-authentication/azuread/).

After Microsoft Entra authentication is configured, enable current user authentication in the `[azure]` section of your Grafana configuration file:

```ini
[azure]
user_identity_enabled = true
```

Optionally, override the Microsoft Entra authentication settings in the `[azure]` section:

```ini
[azure]
user_identity_enabled = true

user_identity_client_authentication =
user_identity_client_id =
user_identity_client_secret =
user_identity_managed_identity_client_id =
user_identity_federated_credential_audience =
```

For example, you can provide a different Microsoft Entra application for token exchange:

```ini
[azure]
user_identity_enabled = true

user_identity_client_id = 4fc34037-97bd-4e84-9db4-86238c78e32a
user_identity_client_secret = 4479f5a6-444c-4271-8790-60eeb42225ae
```

You can also customize the token endpoint:

```ini
[azure]
user_identity_enabled = true

user_identity_token_url = https://custom-token-endpoint/oauth2/v2.0/token
user_identity_client_id = 4fc34037-97bd-4e84-9db4-86238c78e32a
user_identity_client_secret = 4479f5a6-444c-4271-8790-60eeb42225ae
```

#### Fallback service credentials

With current user authentication, every query runs as the Grafana user who is signed in. That works when someone is viewing a dashboard, but some Grafana features run in the background with no signed-in user. The main ones are alerting, recorded queries, and reporting. Because these features have no user to run as, they fail.

To keep them working, set up fallback service credentials. Fallback credentials are a shared identity, such as an App Registration, managed identity, or workload identity, that the data source uses whenever a request has no signed-in user. When you enable them, background features such as alerting continue to work instead of failing.

{{< admonition type="note" >}}
Requests that use the fallback run as this shared identity rather than as an individual user. As a result, they might return different data than an interactive query run by a specific user.
{{< /admonition >}}

To set up fallback service credentials, complete the following three steps.

1. Enable fallback credentials in the `[azure]` section of your Grafana configuration file. This setting is `true` by default when `user_identity_enabled` is set, but you can also set it explicitly.

   ```ini
   [azure]
   user_identity_enabled = true
   user_identity_fallback_credentials_enabled = true
   ```

1. Enable ID forwarding. Grafana needs a way to distinguish a signed-in user's request from a background job. The `idForwarding` feature toggle provides that signal.

   ```ini
   [feature_toggles]
   idForwarding = true
   ```

   Without `idForwarding`, Grafana can't recognize background requests, such as alert evaluations, as having no user, so it never switches to the fallback and those requests fail.

1. Add the credentials in the data source settings:

   1. Set the authentication type to **Current User**.
   1. Set **Service Credentials** to **Enabled**.
   1. Under **Authentication**, select the identity type: **App Registration**, **Managed Identity**, or **Workload Identity**.
   1. Enter the credential details for the identity type you selected.

<!-- vale Grafana.Headings = NO -->

### On-Behalf-Of (Beta)

<!-- vale Grafana.Headings = YES -->

{{< admonition type="caution" >}}
On-Behalf-Of authentication is in Beta and is subject to breaking changes. It's only compatible with Grafana 8.3.4 or later.
{{< /admonition >}}

On-Behalf-Of (OBO) authentication exchanges the signed-in user's token for an Azure Data Explorer token, so queries run with the user's identity. Enable the feature explicitly in the `[feature_toggles]` section of your Grafana configuration file:

```ini
[feature_toggles]
adxOnBehalfOf = true
```

To complete the setup:

1. Configure Grafana to use OAuth2 with Microsoft Entra ID, as described in [Configure Azure AD/Entra ID OAuth authentication](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-security/configure-authentication/azuread/). The `[auth.azuread]` `scopes` setting must contain `openid email profile`.
1. Enable ID tokens on the [Azure portal](https://portal.azure.com/) under **App Registrations** > your application > **Manage** > **Authentication**.
1. Add the **Azure Data Explorer** `user_impersonation` API permission, in addition to the **Microsoft Graph** `User.Read` permission, under **App Registrations** > your application > **Manage** > **API permissions**.
1. Grant **Admin consent** under **App Registrations** > your application > **API permissions**. Admin consent grants consent on behalf of all users in the tenant, so users aren't prompted to consent individually.

{{< admonition type="note" >}}
Don't set up alerts when the data source uses On-Behalf-Of authentication. Alert rules stop working after the user who created the rule signs out of Grafana. On-Behalf-Of authentication isn't supported for national clouds, such as Azure China or Azure Government.
{{< /admonition >}}

## Additional settings

The following settings are optional and grouped into collapsible sections on the data source configuration page.

### Query optimizations

| Setting | Description |
|---------|-------------|
| **Query timeout** | Controls the client query timeout. Defaults to `30s`. |
| **Use dynamic caching** | When enabled, Grafana applies cache settings per query, and the default cache max age is ignored. The bin size for time series queries widens the time range and is used as the cache max age. |
| **Cache max age** | The cache is disabled by default. To enable query caching, specify a maximum time span for the cache to live. |
| **Data consistency** | Controls how queries and updates are synchronized, either **Strong** or **Weak**. Defaults to **Strong**. For more information, refer to [Query consistency](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/concepts/queryconsistency). |
| **Default editor mode** | Sets the mode the query editor opens in, either **Visual** or **Raw**. Defaults to **Visual**. |

### Database schema settings

| Setting | Description |
|---------|-------------|
| **Default database** | The database used when no database is selected in a query. To populate the list, save the data source with a valid cluster URL and credentials, then click **Reload schema**. |
| **Use managed schema** | When enabled, tables, functions, and materialized views are mapped to user-friendly names. |
| **Schema mappings** | Shown when **Use managed schema** is enabled. Map a target table, function, or materialized view to a display name. |

### Tracking

| Setting | Description |
|---------|-------------|
| **Send username header to host** | When enabled, Grafana passes the signed-in user's username in the `x-ms-user-id` and `x-ms-client-request-id` headers when sending requests to Azure Data Explorer. This is useful for tracking in Azure Data Explorer. |

## Enforce trusted endpoints

For additional security, you can enforce a list of trusted Azure Data Explorer endpoints against which the cluster URL is verified. This prevents a request from being redirected to a third-party endpoint.

To enable this, set `enforce_trusted_endpoints` in the `[plugin.grafana-azure-data-explorer-datasource]` section of your Grafana configuration file:

```ini
[plugin.grafana-azure-data-explorer-datasource]
enforce_trusted_endpoints = true
```

Specify endpoints as URLs with or without ports. A scheme is required. If no port is specified, the scheme must be `http` or `https`, which defaults the port to `80` or `443` respectively.

You can also use wildcards, and you can nest them:

- A prefix wildcard such as `https://*.kusto.windows.net` matches any address with the suffix `kusto.windows.net` and the `https` scheme. It doesn't match `https://kusto.windows.net`, because prefix path segments are expected.
- A nested wildcard such as `https://test.*.windows.net` matches any single path segment in the wildcard position.
- You can mix prefix and nested wildcards, such as `https://*.test.*.windows.net`, which matches endpoints like `https://one.two.three.test.any.windows.net`.

### Allow user-specified trusted endpoints

When an Azure Data Explorer cluster is behind a proxy or load balancer, you might need to specify a trusted endpoint that isn't in the default allow list.

To enable this, set `allow_user_trusted_endpoints` to `true` and specify the required endpoints as a comma-separated list with the `user_trusted_endpoints` key in the `[plugin.grafana-azure-data-explorer-datasource]` section:

```ini
[plugin.grafana-azure-data-explorer-datasource]
enforce_trusted_endpoints = true
allow_user_trusted_endpoints = true
user_trusted_endpoints = https://first.endpoint.com,https://endpoint.second.com
```

{{< admonition type="caution" >}}
Use this feature with caution. Requests sent to endpoints that aren't trusted might expose authentication tokens to unintended third parties.
{{< /admonition >}}

## Private data source connect

{{< admonition type="note" >}}
Private data source connect is only available to Grafana Cloud users.
{{< /admonition >}}

Private data source connect (PDC) establishes a private, secured connection between a Grafana Cloud instance, or stack, and an Azure Data Explorer cluster secured within a private network. In the data source connection settings, use the **Private data source connect** drop-down to locate the URL for PDC. To open your PDC connection page, where you can find your configuration details, click **Manage private data source connect**. For more information, refer to [Private data source connect (PDC)](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/private-data-source-connect/).

PDC routes the connection through a secure socks proxy. When the secure socks proxy is enabled in your Grafana instance (Grafana 10.0.0 or later with the `secureSocksDSProxyEnabled` feature toggle), the data source configuration page also shows a **Secure Socks Proxy** section with an **Enable** toggle. To provision this setting, set `enableSecureSocksProxy` to `true` in `jsonData`.

## Verify the connection

Click **Save & test** to verify the connection. When the connection test succeeds, Grafana displays a **Success** message. If the test fails, or reports that it connected but couldn't reach Azure Resource Graph to list clusters, refer to [Troubleshooting](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/troubleshooting/).

## Provision the data source

You can define the data source in YAML files as part of the Grafana provisioning system. For more information, refer to [Provisioning Grafana](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/administration/provisioning/#data-sources).

The following example provisions an App Registration connection:

```yaml
apiVersion: 1

datasources:
  - name: Azure Data Explorer
    type: grafana-azure-data-explorer-datasource
    access: proxy
    jsonData:
      clusterUrl: <your cluster URL>
      tenantId: <your tenant UUID>
      clientId: <your client UUID>
      defaultDatabase: <your default database>
    secureJsonData:
      clientSecret: <your client secret>
    version: 1
```

The following example provisions an On-Behalf-Of connection. Set `onBehalfOf` and `oauthPassThru` to `true`:

```yaml
apiVersion: 1

datasources:
  - name: Azure Data Explorer
    type: grafana-azure-data-explorer-datasource
    access: proxy
    jsonData:
      onBehalfOf: true
      oauthPassThru: true
      clusterUrl: <your cluster URL>
      tenantId: <your tenant UUID>
      clientId: <your client UUID>
      defaultDatabase: <your default database>
    secureJsonData:
      clientSecret: <your client secret>
    version: 1
```

### Provision with Terraform

You can also manage the data source with the [Grafana Terraform provider](https://registry.terraform.io/providers/grafana/grafana/latest/docs) using the [`grafana_data_source`](https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/data_source) resource. Pass the connection settings as encoded JSON, and keep secrets such as the client secret in `secure_json_data_encoded`.

The following example provisions an App Registration connection:

```hcl
resource "grafana_data_source" "adx" {
  type = "grafana-azure-data-explorer-datasource"
  name = "Azure Data Explorer"

  json_data_encoded = jsonencode({
    clusterUrl      = "<your cluster URL>"
    tenantId        = "<your tenant UUID>"
    clientId        = "<your client UUID>"
    defaultDatabase = "<your default database>"
  })

  secure_json_data_encoded = jsonencode({
    clientSecret = "<your client secret>"
  })
}
```

To provision an On-Behalf-Of connection, add `onBehalfOf` and `oauthPassThru` to `json_data_encoded`:

```hcl
resource "grafana_data_source" "adx_obo" {
  type = "grafana-azure-data-explorer-datasource"
  name = "Azure Data Explorer (OBO)"

  json_data_encoded = jsonencode({
    onBehalfOf      = true
    oauthPassThru   = true
    clusterUrl      = "<your cluster URL>"
    tenantId        = "<your tenant UUID>"
    clientId        = "<your client UUID>"
    defaultDatabase = "<your default database>"
  })

  secure_json_data_encoded = jsonencode({
    clientSecret = "<your client secret>"
  })
}
```

If you set an explicit `uid` on the resource, keep it to 40 characters or fewer and use only letters, numbers, dashes (`-`), and underscores (`_`). Grafana rejects a data source UID that exceeds 40 characters, which causes provisioning to fail. The same limit applies when you create a data source through the HTTP API.

{{< admonition type="note" >}}
Manage each data source with a single provisioning method. If you provision a data source with both YAML files and Terraform, the two methods can overwrite each other.
{{< /admonition >}}
