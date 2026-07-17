---
description: Use annotations with the Azure Data Explorer data source to overlay events on Grafana graphs.
keywords:
  - grafana
  - azure
  - azure data explorer
  - kusto
  - annotations
labels:
  products:
    - cloud
    - enterprise
    - oss
menuTitle: Annotations
title: Azure Data Explorer annotations
weight: 400
review_date: 2026-07-17
---

# Azure Data Explorer annotations

Annotations overlay event markers on graphs. Use an Azure Data Explorer query to add annotations that mark points in time across your dashboard panels.

## Before you begin

Before you create annotations, ensure you have the following:

- A [configured Azure Data Explorer data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/).
- A [dashboard](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/) to add annotations to.

## Create an annotation query

An annotation query can return up to three columns per row. The `datetime` column is mandatory. Because annotation rendering is expensive, limit the number of rows returned.

Return the following columns:

- A column with the `datetime` type.
- A column aliased as `Text` or `text` for the annotation text.
- A column aliased as `Tags` or `tags` for the annotation tags. This column should return a comma-separated string of tags, such as `'tag1,tag2'`.

The following query returns annotations from a log table:

```kusto
MyLogs
| where $__timeFilter(Timestamp)
| project Timestamp, Text=Message, Tags="tag1,tag2"
```

For more information about adding and using annotations, refer to [Annotations](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/build-dashboards/annotate-visualizations/).
