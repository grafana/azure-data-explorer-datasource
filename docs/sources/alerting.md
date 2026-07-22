---
description: Create Grafana alert rules based on Azure Data Explorer queries.
keywords:
  - grafana
  - azure
  - azure data explorer
  - kusto
  - alerting
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Alerting
title: Azure Data Explorer alerting
weight: 500
review_date: 2026-07-17
---

# Azure Data Explorer alerting

Grafana Alerting lets you create alert rules based on Azure Data Explorer queries. Use time series queries to evaluate conditions and notify your team when thresholds are met.

## Before you begin

Before you create alert rules, ensure you have the following:

- A [configured Azure Data Explorer data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/).
- A query that returns time series data. For query guidance, refer to the [Azure Data Explorer query editor](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/query-editor/).

## Create an alert rule

To create an alert rule that uses Azure Data Explorer data:

1. Navigate to **Alerting** > **Alert rules**.
1. Click **New alert rule**.
1. In the query section, select the Azure Data Explorer data source.
1. Write a query that returns time series data, then define the alert condition.
1. Set the evaluation behavior, labels, and notifications.
1. Click **Save rule and exit**.

For complete guidance, refer to [Grafana Alerting](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/alerting/).

## Example query

An alert query must return time series data: exactly one `datetime` column and one or more numeric columns. Use an explicit bin size and order the results by time in ascending order. The following query returns the average value per five-minute interval, which you can evaluate against a threshold condition:

```kusto
MyMetrics
| where $__timeFilter(Timestamp)
| summarize avg(Value) by bin(Timestamp, 5m)
| order by Timestamp asc
```

## Authentication requirements for alerting

Alert rules run in the background with no signed-in user. The authentication method you choose determines whether alerting works.

{{< admonition type="caution" >}}
Alerting isn't supported with On-Behalf-Of authentication. Alert rules stop working after the user who created the rule signs out of Grafana.
{{< /admonition >}}

If you use Current User authentication, background features such as alert evaluations, recorded queries, and reporting have no user to run as, so they fail unless you configure fallback service credentials. To keep alerting working, set up [fallback service credentials](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/#fallback-service-credentials).

## Time interval macros in alert queries

Avoid using the `$__timeInterval` macro in alert queries. In alerting, this macro always expands to `1000ms`, which can produce unexpected bin sizes. Use an explicit bin size instead.
