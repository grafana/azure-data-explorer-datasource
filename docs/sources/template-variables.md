---
description: Use template variables with the Azure Data Explorer data source to create dynamic, reusable Grafana dashboards.
keywords:
  - grafana
  - azure
  - azure data explorer
  - kusto
  - template variables
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Template variables
title: Azure Data Explorer template variables
weight: 300
review_date: 2026-07-17
---

# Azure Data Explorer template variables

Use template variables to create dynamic, reusable dashboards. Instead of hard-coding values such as server, application, or sensor names in your queries, you can use variables that appear as drop-down lists at the top of the dashboard.

## Before you begin

Before you create template variables, ensure you have the following:

- A [configured Azure Data Explorer data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/).
- An understanding of [Grafana template variables](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/variables/).

## Create a query variable

To create a query variable:

1. Navigate to **Dashboard settings** > **Variables**.
1. Click **Add variable**.
1. Select **Query** as the variable type.
1. In the **Query options** section, select the Azure Data Explorer data source.
1. Select a **Query Type**. The type determines which values the variable returns and which fields you must complete.
1. Complete the dependent fields, or write a query if you select **Kusto Query**.
1. Review the preview of returned values at the bottom.

The Azure Data Explorer variable editor supports the following query types:

| Query type | Returns | Required fields |
|------------|---------|-----------------|
| **Clusters** | The clusters available to the data source. | None |
| **Databases** | The databases in the selected cluster. | **Cluster** |
| **Tables** | The tables in the selected database. | **Cluster**, **Database** |
| **Columns** | The columns in the selected table. | **Cluster**, **Database**, **Table** |
| **Kusto Query** | The results of a Kusto query. Use `project` to return a single column of string values. | A Kusto query |

The **Name** field sets the variable name. Use the **Label** field to set a friendly display name.

## Use variables in queries

Reference a variable in a query with the `$` prefix. For example, if the variable is named `level`:

```kusto
MyLogs
| where Level == '$level'
```

For variables that allow multiple values, use the `in` operator:

```kusto
MyLogs
| where Level in ($level)
```

## Query for a list of databases

To populate a variable with the databases in a cluster, select the **Databases** query type and choose a cluster. This is the recommended approach.

Alternatively, select the **Kusto Query** type and use the `databases()` function, which returns the list of databases:

```kusto
databases()
```

You can use a database variable in the query header's **Database** drop-down to switch databases without editing the panel query. To use the variable, type its name in the drop-down. For example, if the variable is named `database`, type `$database`.

## Template variable macros

Use the following macros with multi-value template variables:

| Macro | Description |
|-------|-------------|
| `$__escapeMulti($myVar)` | Use with multi-value variables that contain illegal characters. For example, if `$myVar` has the value `'\\grafana-vm\Network(eth0)\Total','\\hello!'`, it expands to `@'\\grafana-vm\Network(eth0)\Total', @'\\hello!'`. For single-value variables, escape the variable inline instead, such as `@'\$myVar'`. |
| `$__contains(colName, $myVar)` | Use with multi-value variables. For example, if `$myVar` has the value `'value1','value2'`, it expands to `colName in ('value1','value2')`. If you use the **Include All** option, check **Include All option** and set the **Custom all value** field to `all`. When `$myVar` has the value `all`, the macro expands to `1 == 1`. This improves query performance for variables with many options by avoiding a large `where..in` clause. |
