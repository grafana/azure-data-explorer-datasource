---
description: Use the Azure Data Explorer query editor in Grafana to build queries with the visual builder, KQL, or the OpenAI query generator.
keywords:
  - grafana
  - azure
  - azure data explorer
  - kusto
  - kql
  - query editor
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Query editor
title: Azure Data Explorer query editor
weight: 200
review_date: 2026-07-17
---

# Azure Data Explorer query editor

This document explains how to use the Azure Data Explorer query editor to build queries for dashboards, Explore, and alerts.

## Before you begin

Before you build queries, ensure you have the following:

- A [configured Azure Data Explorer data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/).
- An identity with viewer access to the databases you query.

## Key concepts

If you're new to Azure Data Explorer, these terms are used throughout the query editor:

| Term | Description |
|------|-------------|
| **KQL** | Kusto Query Language, the query language used by Azure Data Explorer. |
| **Cluster** | The Azure Data Explorer resource that hosts one or more databases. |
| **Database** | A collection of tables, functions, and materialized views within a cluster. |
| **Dynamic column** | A column that holds a JSON value, such as an array or nested object. |

## Query header

Before you write a query, select the cluster, database, and format in the query header.

### Cluster

Select a cluster to query. If a default cluster is set in the data source settings, it auto-populates the cluster selection. If no clusters are available, refer to [Configure the Azure Data Explorer data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/).

### Database

Select a database to query. If a default database is set in the data source settings, it auto-populates the database selection.

### Format as

Use the **Format as** drop-down to format query results. The **Table**, **Time series**, **Trace**, and **Logs** formats are always available. In **KQL** mode, an additional **ADX Time series** format is available for `make-series` queries.

- **Table** queries are mainly used in the table panel as a list of columns and rows. The following query returns rows with six columns:

  ```kusto
  AzureActivity
  | where $__timeFilter()
  | project TimeGenerated, ResourceGroup, Category, OperationName, ActivityStatus, Caller
  | order by TimeGenerated desc
  ```

- **Time series** queries are for the graph panel and similar panels. The query must contain exactly one `datetime` column, one or more numeric columns, and optionally one or more string columns as labels. The time column should be in ascending order. The following query returns the aggregated count grouped by the `Category` column and by hour:

  ```kusto
  AzureActivity
  | where $__timeFilter(TimeGenerated)
  | summarize count() by Category, bin(TimeGenerated, 1h)
  | order by TimeGenerated asc
  ```

  Numeric columns are treated as metrics, and optional string columns are treated as tags. A time series is returned for each value column combined with a unique set of string column values.

- **Trace** format displays data in the built-in trace visualization. The data must follow the [trace data frame structure](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/explore/trace-integration/). The schema contains the `logs`, `serviceTags`, and `tags` fields, which are expected to be JSON objects:

  - `logs` is an array of JSON objects, each with a `timestamp` field that has a numeric value and a `fields` field that is a key-value object.
  - `serviceTags` and `tags` are key-value JSON objects without nested objects.

  Values for keys are expected to be primitive types. When empty, pass `null`, an empty JSON object for `serviceTags` and `tags`, or an empty array for `logs`.

- **Logs** formats query results for the logs panel and the **Logs** view in Explore. Include a `datetime` column for the log timestamp and a string column for the log message. The following query returns log rows within the dashboard time range:

  ```kusto
  MyLogTable
  | where $__timeFilter(Timestamp)
  | project Timestamp, Level, Message
  | order by Timestamp desc
  ```

- **ADX Time series** is available in **KQL** mode for queries that use the Kusto `make-series` operator. The query must have exactly one `datetime` column named `Timestamp` and at least one value column. Optionally, string columns are treated as labels:

  ```kusto
  let T = range Timestamp from $__timeFrom to ($__timeTo + -30m) step 1m
    | extend Person = dynamic(["Torkel", "Daniel", "Kyle", "Sofia"])
    | extend Place = dynamic(["EU", "EU", "US", "EU"])
    | mvexpand Person, Place
    | extend HatInventory = rand(5)
    | project Timestamp, tostring(Person), tostring(Place), HatInventory;
  T
  | make-series AvgHatInventory=avg(HatInventory) default=double(null) on Timestamp from $__timeFrom to $__timeTo step 1m by Person, Place
  | extend series_decompose_forecast(AvgHatInventory, 30)
  | project-away *residual, *baseline, *seasonal
  ```

## Editor modes

Select the editor mode with the mode toggle in the query header. The query editor has three modes:

- **Builder:** Build queries visually without writing KQL.
- **KQL:** Write raw Kusto Query Language.
- **OpenAI:** Generate KQL from a natural language prompt.

## Visual query builder

Select **Builder** mode to build a query without writing KQL. The builder constructs the query from the table, columns, filters, aggregations, and grouping that you select, and shows a live KQL preview below the builder.

| Field | Description |
|-------|-------------|
| **Table** | Select a table. |
| **Columns** | Select a subset of columns for faster results. Time series requires both time and numeric values; other columns are rendered as dimensions. Leave the field empty to select all columns. For more information, refer to [Time series dimensions](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/fundamentals/timeseries-dimensions/). |
| **Filters** | Add filters for the selected columns. Filter values are restricted to the column's data type. |
| **Aggregate** | Add aggregations for the selected columns. Select an aggregation type and a column to aggregate. |
| **Group by** | Add group-by clauses for the selected columns. For time group-bys, select a time range bucket. |
| **Timeshift** | Optionally shift the query time range to compare with an earlier period. Select **Hour before**, **Day before**, **Week before**, or enter a custom value such as `2h`. |

The visual query builder supports `dynamic` columns, including arrays, JSON objects, and nested objects within arrays. Only the first 50,000 rows are queried, so only properties in the first 50,000 rows appear as options in the builder selectors. You can manually enter additional values that don't appear by default. Because these queries use `mv-expand`, they can become resource intensive.

For more information about handling dynamic columns in KQL, refer to [Kusto data types](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/scalar-data-types/) and the [dynamic data type](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/scalar-data-types/dynamic).

## KQL editor

Select **KQL** mode to write queries in Kusto Query Language. The editor provides syntax highlighting and autocompletion for tables, columns, and functions. For more information, refer to the [Kusto Query Language (KQL) overview](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/).

The following query returns the count of events per interval within the dashboard time range:

```kusto
MyTable
| where $__timeFilter(Timestamp)
| summarize count() by bin(Timestamp, 1h)
| order by Timestamp asc
```

When the LLM plugin is enabled, click **Explain KQL** to generate a plain-language explanation of the current query.

## OpenAI query generator

{{< admonition type="note" >}}
You must install and enable the LLM plugin to use this feature.
{{< /admonition >}}

Select **OpenAI** mode to generate KQL from a natural language prompt. Install the [LLM app](https://grafana.com/grafana/plugins/grafana-llm-app/), then enable it.

To use the query generator:

1. Type a statement or question about the data you want to see.
1. Click **Generate query**.
1. Review and edit the generated KQL in the **Generated query** field.
1. Click **Run query**.

## Macros

Use the following macros in your queries to work with the dashboard time range:

| Macro | Description |
|-------|-------------|
| `$__timeFilter()` | Expands to a time range filter on `TimeGenerated` using the dashboard time picker. |
| `$__timeFilter(datetimeColumn)` | Expands to a time range filter on the specified column using the dashboard time picker. |
| `$__timeFrom` | Expands to the start time of the query, such as `datetime(2018-06-05T18:09:58.907Z)`. |
| `$__timeTo` | Expands to the end time of the query. |
| `$__timeInterval` | Expands to the bin size recommended by Grafana, in milliseconds, such as `5000ms`. In alerting, this is always `1000ms`. Avoid using this macro in alert queries. |

## Next steps

- [Use template variables](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/template-variables/)
- [Set up alerting](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/alerting/)
