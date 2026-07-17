---
description: The Azure Data Explorer data source allows you to query and visualize Azure Data Explorer data in Grafana.
keywords:
  - grafana
  - azure
  - azure data explorer
  - adx
  - kusto
  - kql
  - data source
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Azure Data Explorer
title: Azure Data Explorer data source
weight: 10
review_date: 2026-07-17
---

# Azure Data Explorer data source

The Azure Data Explorer data source allows you to query and visualize data from [Azure Data Explorer](https://learn.microsoft.com/en-us/azure/data-explorer/), a fast, fully managed data analytics service for real-time analysis of large volumes of data. Use the visual query builder or write Kusto Query Language (KQL) to build dashboards, explore logs and traces, and set up alerts.

{{< admonition type="note" >}}
The Azure Data Explorer data source is an Enterprise plugin. It's available with a Grafana Cloud Pro or Advanced plan and Grafana Enterprise. For installation instructions, refer to [Install Grafana Enterprise plugins](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/administration/plugin-management/#install-grafana-enterprise-plugins).
{{< /admonition >}}

## Supported features

| Feature | Supported | Description |
| ---------------------- | --------- | ------------------------------------------------------------------ |
| **Metrics** | Yes | Query numeric data and visualize it as time series or tables. |
| **Logs** | Yes | Query and visualize log data. |
| **Traces** | Yes | Format query results for the built-in trace visualization. |
| **Alerting** | Yes | Create alert rules based on Azure Data Explorer queries. |
| **Annotations** | Yes | Overlay events from Azure Data Explorer on your dashboards. |
| **Template variables** | Yes | Create dynamic dashboards with query-based variables. |

## Requirements

Before you use the Azure Data Explorer data source, verify that you meet the following requirements:

- Grafana 11.6.11 or later.
- A [Grafana Cloud Pro or Advanced](https://grafana.com/pricing/) plan or an [activated self-managed Grafana Enterprise license](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/administration/enterprise-licensing/).
- An Azure Data Explorer cluster and database, and a Microsoft Entra identity with viewer access to that database.

## Get started

The following documents help you get started with the Azure Data Explorer data source:

- [Configure the Azure Data Explorer data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/) - Set up the connection and authentication.
- [Azure Data Explorer query editor](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/query-editor/) - Build queries with the visual builder, KQL, or the OpenAI query generator.
- [Template variables](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/template-variables/) - Create dynamic dashboards with Azure Data Explorer variables.
- [Annotations](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/annotations/) - Overlay Azure Data Explorer events on your graphs.
- [Alerting](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/alerting/) - Create alert rules from Azure Data Explorer queries.
- [Troubleshooting](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/troubleshooting/) - Solve common connection, authentication, and query errors.

## Additional features

After you configure the Azure Data Explorer data source, you can:

- Use [Explore](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/explore/) to query data without building a dashboard.
- Add [Transformations](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/panels-visualizations/query-transform-data/transform-data/) to manipulate query results.
- Set up [Alerting](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/alerting/) rules based on your Azure Data Explorer data.

## Plugin updates

Always ensure that your plugin version is up-to-date so you have access to all current features and improvements. Navigate to **Plugins and data** > **Plugins** to check for updates. Grafana recommends upgrading to the latest Grafana version, and this applies to plugins as well.

{{< admonition type="note" >}}
On Grafana Cloud, the Azure Data Explorer plugin is managed by Grafana and updates automatically. On self-managed Grafana, you must update Enterprise plugins manually. Refer to [Version and upgrade guidance](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/troubleshooting/#version-and-upgrade-guidance).
{{< /admonition >}}

## Related resources

- [Azure Data Explorer documentation](https://learn.microsoft.com/en-us/azure/data-explorer/)
- [Kusto Query Language (KQL) overview](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/)
- [`azure-data-explorer-datasource` on GitHub](https://github.com/grafana/azure-data-explorer-datasource) - Source code, issues, and CHANGELOG.
- [Grafana community forum](https://community.grafana.com/)
