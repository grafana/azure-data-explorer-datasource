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

### Check and update the plugin version

1. Navigate to **Connections** > **Plugins and data** > **Plugins**.
1. Search for the plugin and open its page.
1. Review the installed version and the latest available version.
1. If an update is available and you're on self-managed Grafana, click **Update**.

### Symptoms of an outdated plugin version

- **Configuration tab is blank or incomplete.** Older versions might not render all settings fields.
- **Connection failures with unhelpful errors.** Severely outdated versions can fail to connect at all.
- **Intermittent `Plugin unavailable` or HTTP 500 errors**, especially in managed environments with many panels.

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
Authorization errors aren't propagated to the end user for security reasons. Review the Grafana server logs for details.
{{< /admonition >}}

## Connection errors

These errors occur when Grafana can't reach the Azure Data Explorer cluster.

### Connection refused or timeout errors

**Symptoms:**

- The data source test times out.
- Queries fail with network errors.

**Solutions:**

1. Verify network connectivity from the Grafana server to the cluster URL.
1. Check that firewall rules allow outbound HTTPS on port 443.
1. If you enforce trusted endpoints, verify the cluster URL matches an allowed endpoint. Refer to [Enforce trusted endpoints](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/#enforce-trusted-endpoints).
1. For private networks in Grafana Cloud, configure [Private data source connect](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/private-data-source-connect/).

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
1. Verify the query uses `project` to return a single column of string values.
1. For a list of databases, use the `databases()` function.
1. Verify the identity has permission to list the requested resources.

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
