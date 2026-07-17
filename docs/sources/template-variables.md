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
1. Write the query in the **Query** field. Use `project` to specify one column. The result should be a list of string values.
1. Review the preview of returned values at the bottom.

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

There's no Kusto Query Language function to fetch a list of databases directly. When you create a query variable, use the `databases()` function in the **Query** field to return a list of databases:

```kusto
databases()
```

You can use this variable in the database drop-down to switch databases without editing the panel query. To use the variable, type the variable name in the drop-down. For example, if the variable is named `database`, type `$database`.

## Template variable macros

Use the following macros with multi-value template variables:

| Macro | Description |
|-------|-------------|
| `$__escapeMulti($myVar)` | Use with multi-value variables that contain illegal characters. For example, if `$myVar` has the value `'\\grafana-vm\Network(eth0)\Total','\\hello!'`, it expands to `@'\\grafana-vm\Network(eth0)\Total', @'\\hello!'`. For single-value variables, escape the variable inline instead, such as `@'\$myVar'`. |
| `$__contains(colName, $myVar)` | Use with multi-value variables. For example, if `$myVar` has the value `'value1','value2'`, it expands to `colName in ('value1','value2')`. If you use the **Include All** option, check **Include All option** and set the **Custom all value** field to `all`. When `$myVar` has the value `all`, the macro expands to `1 == 1`. This improves query performance for variables with many options by avoiding a large `where..in` clause. |
