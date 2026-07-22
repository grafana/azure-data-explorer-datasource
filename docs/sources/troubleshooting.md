---
description: Troubleshooting guide for the Azure Data Explorer data source in Grafana, covering authentication, connection, and query errors.
keywords:
  - grafana
  - azure
  - azure data explorer
  - kusto
  - troubleshooting
  - errors
  - authentication
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Troubleshooting
title: Troubleshoot Azure Data Explorer data source issues
weight: 600
review_date: 2026-07-17
---

# Troubleshoot Azure Data Explorer data source issues

This document provides solutions to common issues you might encounter when configuring or using the Azure Data Explorer data source. For configuration instructions, refer to [Configure the Azure Data Explorer data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/).

## Version and upgrade guidance

Many Azure Data Explorer issues are caused by running an outdated plugin version. Before deeper troubleshooting, confirm you're on the latest version, because upgrading resolves a wide range of problems.

{{< admonition type="note" >}}
On Grafana Cloud, the Azure Data Explorer plugin is managed by Grafana and updates automatically. On self-managed Grafana, you must update Enterprise plugins manually. In other managed environments, such as Azure Managed Grafana, the plugin version is controlled by the platform provider and can lag behind the latest release.
{{< /admonition >}}

### Supported Grafana versions

The current plugin release supports the following Grafana versions. If your Grafana version is earlier than the minimum patch for its minor release, the plugin might fail to load or behave unexpectedly.

| Grafana version | Minimum required patch |
|-----------------|------------------------|
| 11.6 and later 11.x | 11.6.11 |
| 12.0 | 12.0.10 |
| 12.1 | 12.1.7 |
| 12.2 and later | 12.2.5 |

Grafana versions earlier than 11.6.11 aren't supported. Compatibility requirements can change between plugin releases. To confirm the requirement for a specific plugin version, check the **Dependencies** section on the [plugin catalog page](https://grafana.com/grafana/plugins/grafana-azure-data-explorer-datasource/), or the `grafanaDependency` field in that version's `plugin.json`.

### Check and update the plugin version

1. Navigate to **Connections** > **Plugins and data** > **Plugins**.
1. Search for the plugin and open its page.
1. Review the installed version and the latest available version.
1. If an update is available and you're on self-managed Grafana, click **Update**.

### Symptoms of an outdated plugin version

- **Configuration tab is blank or incomplete.** Older versions might not render all settings fields.
- **Connection failures with unhelpful errors.** Severely outdated versions can fail to connect at all.
- **Intermittent `Plugin unavailable` or HTTP 500 errors**, especially in managed environments with many panels.

### Plugin fails to load, crashes, or freezes after a version change

**Symptoms:**

- The plugin fails to load after a plugin or Grafana version update.
- A specific feature crashes, such as annotations or schema loading.
- Grafana becomes unresponsive when you select Azure Data Explorer as a data source.

**Solutions:**

1. Check for a version mismatch. Confirm your Grafana version meets the minimum patch in [Supported Grafana versions](#supported-grafana-versions).
1. Clear your browser cache and reload. Stale frontend assets left over from an upgrade can cause loading failures and freezes.
1. Review the Grafana server logs for plugin load errors, and the browser developer console for frontend errors.
1. If the problem started immediately after a plugin update, roll back to the last version that worked, then upgrade again once a fixed release is available. For install and rollback commands, refer to [Upgrade the plugin](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/install/#upgrade-the-plugin).

{{< admonition type="note" >}}
When you upgrade or downgrade the plugin, first confirm the target version supports your Grafana version, then restart the Grafana server so the change takes effect. On Grafana Cloud, the plugin is managed by Grafana; contact Support for version-specific issues.
{{< /admonition >}}

### Authentication regressions after a Grafana upgrade

Authentication that previously worked can break after a Grafana upgrade because the underlying Azure authentication behavior is provided by Grafana rather than the plugin. Managed Identity and On-Behalf-Of authentication are the most commonly affected methods, and regressions are typically resolved in a later patch release.

If authentication stops working immediately after an upgrade and your Azure configuration hasn't changed:

1. Confirm the failure started with a specific Grafana version by checking the [Grafana release notes](https://github.com/grafana/grafana/releases).
1. Upgrade to the latest patch release for your Grafana minor version, which often contains the fix.
1. Verify the plugin version is compatible with your Grafana version. The plugin requires Grafana 11.6.11 or later.

## Authentication errors

These errors occur when credentials are invalid, missing, or don't have the required permissions.

### "Access denied" or authorization errors

**Symptoms:**

- **Save & test** fails with an authorization error.
- Queries return access denied messages.
- Databases or tables don't load in drop-downs.

**Possible causes and solutions:**

| Cause | Solution |
|-------|----------|
| Missing database permissions | Grant the identity viewer access using `.add database <database> viewers ('aadapp=<client id>;<tenant id>')`. |
| Invalid credentials | Verify the tenant ID, client ID, and client secret in the Microsoft Entra portal. Regenerate the secret if necessary. |
| Expired client secret | Create a new client secret and update the data source configuration. |
| Wrong cluster URL | Verify the cluster URL matches your Azure Data Explorer cluster. |
| `401 Unauthorized` responses | The identity isn't authorized for the cluster or database. Grant it viewer access, and verify its role assignments in Azure. |
| Azure role misconfiguration | Many authorization failures originate from Azure-side role or permission configuration rather than the plugin. Verify the identity's Azure role assignments and database access before reporting a plugin issue. |

### Managed Identity authentication fails after a Grafana upgrade

**Symptoms:**

- Managed Identity authentication worked before a Grafana upgrade and now fails.
- The data source returns authentication errors even though the managed identity and its permissions are unchanged.

**Solutions:**

1. Confirm `managed_identity_enabled` is still set in the `[azure]` section of your Grafana configuration.
1. Verify the managed identity still has viewer access to the database.
1. If the failure began right after an upgrade, treat it as a version regression. Refer to [Authentication regressions after a Grafana upgrade](#authentication-regressions-after-a-grafana-upgrade).

### On-Behalf-Of authorization failures

**Symptoms:**

- Queries fail after a user signs in with OBO authentication.
- Alert rules stop returning data.

**Solutions:**

1. Verify the `adxOnBehalfOf` feature toggle is enabled.
1. Confirm the **Azure Data Explorer** `user_impersonation` API permission is granted and **Admin consent** is enabled.
1. Confirm the `[auth.azuread]` `scopes` setting contains `openid email profile` and that ID tokens are enabled.
1. Don't use OBO authentication for alerting. Alert rules stop working after the rule's creator signs out.

{{< admonition type="note" >}}
The On-Behalf-Of Beta notice shown in the data source configuration is an advisory message, not an error. It doesn't indicate a failed connection. On-Behalf-Of authentication can break on specific plugin and Grafana version combinations, so confirm you're on compatible versions. Refer to [Authentication regressions after a Grafana upgrade](#authentication-regressions-after-a-grafana-upgrade).
{{< /admonition >}}

{{< admonition type="note" >}}
Authorization errors aren't propagated to the end user for security reasons. Review the Grafana server logs for details.
{{< /admonition >}}

## Connection errors

These errors occur when Grafana can't reach the Azure Data Explorer cluster.

### Data source not working: connection checklist

If the data source doesn't work and the error message isn't specific, work through this checklist before deeper troubleshooting:

1. Confirm you're on the latest plugin version and it's compatible with your Grafana version. Refer to [Version and upgrade guidance](#version-and-upgrade-guidance).
1. Verify the **Default cluster URL** is correct and reachable from the Grafana server.
1. Confirm the selected authentication method is fully configured, and that the identity has viewer access to the database. Refer to [Authentication errors](#authentication-errors).
1. Click **Save & test** and note the exact message. Use it to find the matching entry in this guide.
1. Review the Grafana server logs and the browser developer console for plugin errors.
1. Confirm the problem isn't on the Azure side, such as a paused cluster, changed permissions, or a networking change.

### Connection refused or timeout errors

**Symptoms:**

- The data source test times out.
- Queries fail with network errors.

**Solutions:**

1. Verify network connectivity from the Grafana server to the cluster URL.
1. Check that firewall rules allow outbound HTTPS on port 443.
1. If you enforce trusted endpoints, verify the cluster URL matches an allowed endpoint. Refer to [Enforce trusted endpoints](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/#enforce-trusted-endpoints).
1. For private networks in Grafana Cloud, configure [Private data source connect](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/private-data-source-connect/).

### Connected to the cluster but can't list clusters

**Symptoms:**

- **Save & test** reports `Success connecting to Azure Data Explore, but unable to connect to Azure Resource Graph to get clusters`.
- Queries against your database work, but the cluster drop-down doesn't populate automatically.

**Solutions:**

The data source connected to your cluster, but it couldn't query Azure Resource Graph to enumerate clusters. Azure Resource Graph requires the identity to have Reader access at the subscription level. Grant the identity the `Reader` role, or enter the cluster URL manually in the query header. For role assignment steps, refer to [Configure the Azure Data Explorer data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/#app-registration).

### Private Data Source Connect issues

Private Data Source Connect (PDC) is a Grafana Cloud feature that connects to clusters on a private network. Because traffic passes through the PDC agent instead of a direct connection, it introduces extra components that can affect reliability.

**Symptoms:**

- The connection works with a direct connection but fails or is unstable through PDC.
- Queries succeed intermittently through PDC.

**Solutions:**

1. Confirm the PDC agent is running and connected. Queries fail whenever the agent is down.
1. Verify the PDC network path can reach the cluster URL on outbound HTTPS port 443.
1. Confirm the data source is assigned to the correct PDC connection in its settings.
1. To isolate whether an issue is specific to PDC, temporarily test with a direct connection if your network allows it.

For setup details, refer to [Private data source connect](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/#private-data-source-connect).

### Intermittent connection failures

**Symptoms:**

- The data source works most of the time but fails intermittently.
- Failures don't correlate with a configuration change in Grafana.

**Solutions:**

1. Check the health of the Azure Data Explorer cluster. A paused, throttled, or scaling cluster can cause intermittent failures.
1. Confirm the cluster and its permissions haven't changed on the Azure side.
1. If failures coincide with a Grafana stack redeployment or restart, retest after the deployment stabilizes. Transient errors during a redeployment usually resolve on their own.
1. Review the Grafana server logs to correlate failures with cluster-side or network events.

## Query errors

These errors occur when executing queries against the cluster.

### No data or empty results

**Symptoms:**

- A query runs without error but returns no data.
- Panels show a **No data** message.

**Possible causes and solutions:**

| Cause | Solution |
|-------|----------|
| Time range doesn't contain data | Expand the dashboard time range or verify data exists in the table. |
| Wrong cluster or database | Verify you selected the correct cluster and database in the query header. |
| Missing time filter | Add `$__timeFilter()` to the `where` clause so results fall within the dashboard time range. |

### Query timeout

**Symptoms:**

- A query runs for a long time and then fails.
- The error mentions a timeout or query limits.

**Solutions:**

1. Narrow the time range to reduce the data volume.
1. Add filters to reduce the result set.
1. Increase the **Query timeout** value in the data source **Additional settings**.
1. Avoid resource-intensive `mv-expand` operations on large dynamic columns.

### Background features fail under Current User authentication

**Symptoms:**

- Dashboards work interactively, but alerting, recorded queries, or reporting fail.
- Background requests return authentication errors with no signed-in user.

**Solutions:**

1. Enable [fallback service credentials](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/#fallback-service-credentials).
1. Enable the `idForwarding` feature toggle so Grafana can distinguish background requests from user requests.
1. Confirm the fallback identity has viewer access to the database.

## Template variable errors

These errors occur when using template variables with the data source.

### Variables return no values

**Solutions:**

1. Test the data source connection in the data source settings.
1. Verify you selected the correct **Query Type** and completed the required fields, such as **Cluster**, **Database**, or **Table**.
1. For a **Kusto Query** variable, verify the query uses `project` to return a single column of string values.
1. Verify the identity has permission to list the requested resources.

## Provisioning errors

These errors occur when you provision the data source with Terraform, YAML files, or the HTTP API instead of the UI.

### Provisioning fails with an invalid UID

**Symptoms:**

- Terraform or API provisioning fails when you set an explicit `uid` on the data source.
- The error mentions an invalid or too-long UID.

**Solutions:**

1. Keep the `uid` to 40 characters or fewer. Grafana rejects a data source UID that exceeds 40 characters.
1. Use only letters, numbers, dashes (`-`), and underscores (`_`) in the UID.
1. If you don't need a fixed UID, omit the field and let Grafana generate one.

### Data source is overwritten or reverts after provisioning

**Symptoms:**

- Configuration changes made in the UI disappear after a restart.
- Two provisioning methods appear to compete.

**Solutions:**

Manage each data source with a single provisioning method. If you provision the same data source with both YAML files and Terraform, the two methods can overwrite each other. Refer to [Provision the data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/#provision-the-data-source).

## Enable debug logging

To capture detailed error information for troubleshooting:

1. Set the Grafana log level to `debug` in the configuration file:

   ```ini
   [log]
   level = debug
   ```

1. Review logs in `/var/log/grafana/grafana.log` or your configured log location.
1. Look for Azure Data Explorer entries that include request and response details.
1. Reset the log level to `info` after troubleshooting to avoid excessive log volume.

## Get additional help

If you've tried the solutions here and still encounter issues:

1. Check the [Grafana community forums](https://community.grafana.com/) for similar issues.
1. Review the [`azure-data-explorer-datasource` GitHub issues](https://github.com/grafana/azure-data-explorer-datasource/issues) for known bugs.
1. Consult the [Azure Data Explorer documentation](https://learn.microsoft.com/en-us/azure/data-explorer/) for service-specific guidance.
1. Contact Grafana Support if you're an Enterprise, Cloud Pro, or Cloud Advanced customer.
1. When reporting issues, include the Grafana version, plugin version, error messages (with sensitive information redacted), steps to reproduce, and relevant configuration (with credentials redacted).
