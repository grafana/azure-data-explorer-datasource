---
description: Install, upgrade, and verify the Azure Data Explorer data source plugin across Grafana deployment environments.
keywords:
  - grafana
  - azure
  - azure data explorer
  - kusto
  - install
  - upgrade
  - enterprise
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Installation
title: Install and upgrade the Azure Data Explorer data source plugin
weight: 50
review_date: 2026-07-22
---

# Install and upgrade the Azure Data Explorer data source plugin

This document covers how to install, upgrade, and verify the Azure Data Explorer data source plugin across different Grafana deployment environments. After the plugin is installed, refer to [Configure the Azure Data Explorer data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/) to set up a connection.

## Before you begin

Verify the following requirements before installing:

| Requirement | Details |
|-------------|---------|
| **License** | A Grafana Cloud Pro or Advanced plan, or a self-managed Grafana Enterprise license that includes `grafana-azure-data-explorer-datasource`. Free and Starter plans don't include Enterprise plugins. |
| **Grafana version** | Grafana 11.6.11 or later. |
| **Role** | The `Organization administrator` role. Only account administrators can install the plugin and configure the data source. |
| **Network access** | Grafana Cloud instances require internet access to download the plugin from the catalog. Self-managed installs need access to `grafana.com` or a local plugin ZIP. |

## Activate the Enterprise plugin

The Azure Data Explorer data source is a Grafana Enterprise plugin. Before you can install it, the plugin must be licensed and activated for your environment. If the plugin isn't activated, the **Install** button doesn't appear, and **Save & test** returns a generic `Plugin health check failed` error.

### Grafana Cloud

1. Sign in to [Grafana Cloud](https://grafana.com/orgs).
1. Select your organization and open the **Plugins** tab to verify the plugin is activated.
1. If it isn't listed, confirm your Cloud plan is Pro or Advanced, and contact your Grafana account team to add it.

### Self-managed Grafana Enterprise

1. Confirm your Grafana Enterprise license includes the plugin.
1. Provide the license using the `GF_ENTERPRISE_LICENSE_TEXT` environment variable or a path to a license file. Refer to [Activate an Enterprise license](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/administration/enterprise-licensing/).
1. Restart Grafana and confirm the license is active under **Administration** > **General** > **Stats and license**.

## Install the plugin

Choose the installation method that matches your Grafana deployment.

### Grafana Cloud

1. Navigate to **Administration** > **Plugins and data** > **Plugins**.
1. Search for **Azure Data Explorer** and click **Install**.

### Self-managed Grafana (CLI)

Install the plugin with the Grafana command line tool:

```bash
grafana cli plugins install grafana-azure-data-explorer-datasource
```

Restart Grafana after installation.

### Docker

Set the `GF_INSTALL_PLUGINS` environment variable to install the plugin at container startup, and provide the Enterprise license with `GF_ENTERPRISE_LICENSE_TEXT`:

```bash
docker run -d \
  -p 3000:3000 \
  -e "GF_INSTALL_PLUGINS=grafana-azure-data-explorer-datasource" \
  -e "GF_ENTERPRISE_LICENSE_TEXT=<your license text>" \
  grafana/grafana-enterprise
```

### Kubernetes

Add the plugin to your Helm values or the `GF_INSTALL_PLUGINS` environment variable. If you don't control the Helm chart, use an init container to download and unzip the plugin into the plugins volume.

### Air-gapped (offline) installation

1. On a machine with internet access, download the plugin ZIP from the [plugin catalog](https://grafana.com/grafana/plugins/grafana-azure-data-explorer-datasource/).
1. Transfer the ZIP to the Grafana server and extract it into the Grafana plugins directory, such as `/var/lib/grafana/plugins`.
1. Set ownership of the extracted files to the Grafana user and restart Grafana.
1. If Grafana reports an unsigned plugin error, allow the plugin with `allow_loading_unsigned_plugins` in `grafana.ini`.

## Verify the installation

1. Navigate to **Administration** > **Plugins and data** > **Plugins**.
1. Search for **Azure Data Explorer** and verify it shows a status of **Installed**.

## Upgrade the plugin

{{< admonition type="note" >}}
On Grafana Cloud, the Azure Data Explorer plugin is managed by Grafana and updates automatically. On self-managed Grafana, you must update the plugin manually. In other managed environments, such as Azure Managed Grafana, the platform provider controls the plugin version.
{{< /admonition >}}

To upgrade the plugin on self-managed Grafana:

1. Update to the latest version with the Grafana command line tool:

   ```bash
   grafana cli plugins update grafana-azure-data-explorer-datasource
   ```

1. To install a specific version, append the version to the command:

   ```bash
   grafana cli plugins install grafana-azure-data-explorer-datasource <version>
   ```

1. Restart Grafana to load the new version.

To roll back to a previous version on self-managed Grafana, install the specific earlier version and restart Grafana. For upgrade and version troubleshooting, refer to [Version and upgrade guidance](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/troubleshooting/#version-and-upgrade-guidance).

## Uninstall the plugin

To remove the plugin on self-managed Grafana, use the Grafana command line tool and restart Grafana:

```bash
grafana cli plugins remove grafana-azure-data-explorer-datasource
```

For Docker and Kubernetes deployments, remove the plugin from the `GF_INSTALL_PLUGINS` environment variable or Helm values and redeploy.

{{< admonition type="note" >}}
Existing data source configurations are preserved in the Grafana database, but they stop working until you reinstall the plugin.
{{< /admonition >}}

## Troubleshoot installation issues

| Issue | Solution |
|-------|----------|
| Plugin doesn't appear in the catalog | Confirm the plugin is activated for your environment. Refer to [Activate the Enterprise plugin](#activate-the-enterprise-plugin). |
| **Install** button is missing | Verify you have the `Organization administrator` role and that your license includes the plugin. |
| License key errors | Confirm the license text or path is correct and that the license is active under **Administration** > **General** > **Stats and license**. |
| Unsigned plugin error (air-gapped) | Add the plugin ID to `allow_loading_unsigned_plugins` in `grafana.ini` and restart Grafana. |

For more solutions, refer to [Troubleshooting](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/troubleshooting/).
