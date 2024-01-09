# Azure Data Explorer data source for Grafana

[![Build Status](https://drone.grafana.net/api/badges/grafana/azure-data-explorer-datasource/status.svg)](https://drone.grafana.net/grafana/azure-data-explorer-datasource)

[Azure Data Explorer](https://docs.microsoft.com/en-us/azure/data-explorer/) is a log analytics cloud platform optimized for ad-hoc big data queries.

## Installation

This plugin has the following minimum requirements:

- v4.0.0+: Grafana 8.0.0
- v3.0.0+: Grafana 7.1.0
- < v3.0.0 require Grafana 6.3.6.

For detailed instructions on how to install the plugin on Grafana Cloud or
locally, please check out the [Plugin installation docs](https://grafana.com/docs/grafana/latest/plugins/installation/).

### Enforcing trusted Azure Data Explorer endpoints

For additional security, it's possible to enforce a list of trusted ADX endpoints that the cluster URL will be verified against. This prevents a request from being redirected to a third-party endpoint.

This can be enabled by setting `enforce_trusted_endpoints` in your Grafana configuration under the `[plugin.grafana-azure-data-explorer-datasource]` section:

```ini
[plugin.grafana-azure-data-explorer-datasource]
enforce_trusted_endpoints = true
```

## Configuring the datasource in Grafana

The steps for configuring the integration between the Azure Data Explorer service and Grafana are:

1. Create an Azure Active Directory (AAD) Application and AAD Service Principle.
2. Log into the Azure Data Explorer WebExplorer and connect the AAD Application to an Azure Data Explorer database user.
3. Use the AAD Application to configure the datasource connection in Grafana.

### Creating an Azure Active Directory Service Principle

For detailed instructions on how to set up a Microsoft Entra application and service principal that can access resources, please follow this guide from Microsoft [Create a Microsoft Entra application and service principal that can access resources](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal)

An alternative way to create an AAD application is with the Azure CLI. For more information on the Azure CLI command, refer to [az ad sp create-for-rbac](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest#az-ad-sp-create-for-rbac):

```bash
az ad sp create-for-rbac -n "http://url.to.your.grafana:3000"
```

This should return the following:

```json
{
  "appId": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "displayName": "azure-cli-2018-09-20-13-42-58",
  "name": "http://url.to.your.grafana:3000",
  "password": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "tenant": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
}
```

Assign the Reader role to the Service Principal and remove the Contributor role:

```bash
az role assignment create --assignee <your appId> --role Reader
az role assignment delete --assignee <your appId> --role Contributor
```

### Connecting AAD with an Azure Data Explorer User

The AAD application that you created above needs to be given viewer access to your Azure Data Explorer database (in this example the database is called Grafana). This is done using the dot command `add`. The argument for `.add` contains both the client and tenant id separated by a semicolon:

```sql
.add database Grafana viewers ('aadapp=<your client id>;<your tenantid>')
```

A real example with a client/app id and tenant id:

```sql
.add database Grafana viewers ('aadapp=377a87d4-2cd3-44c0-b35a-8887a12fxxx;e7f3f661-a933-4b3f-8176-51c4f982exxx')
```

If the command succeeds you should get a result like this:

![Azure Data Web Explorer Add result](https://raw.githubusercontent.com/grafana/azure-data-explorer-datasource/main/src/img/config_3_web_ui.png)

### Configuring Grafana


1. Accessed from the Grafana main menu, newly installed datasources can be added immediately within the Data Sources section. Next, click the "Add datasource" button in the upper right.

2. Select Azure Data Explorer Datasource from the datasource list.

3. In the name field, a default name is filled in automatically but it can be changed to anything.

4. You need 3 pieces of information from the Azure portal (see link above for detailed instructions):

   - **Directory (tenant) ID** (Azure Active Directory -> Properties -> Directory ID)
   - **Application (client) ID** (Azure Active Directory -> App Registrations -> Choose your app -> Application ID)
   - **Client Secret** ( Azure Active Directory -> App Registrations -> Choose your app -> Keys)

5. Paste these three items into the fields in the Azure Data Explorer API Details section.

6. Click the `Save & Test` button. After a few seconds once Grafana has successfully connected then choose the default database and save again.

### Configuring On-Behalf-Of authentication (Beta)

⚠️ _This feature is in Beta and subject to breaking changes_

For information about setting up and using the OBO flow: [on-behalf-of documentation](https://github.com/grafana/azure-data-explorer-datasource/blob/main/doc/on-behalf-of.md)

## Writing Queries

Queries are written in the new [Kusto Query Language](https://docs.microsoft.com/en-us/azure/kusto/query/).

Queries can be formatted as _Table_, _Time Series_, or _ADX Time Series_ data.

### Table Queries

_Table_ queries are mainly used in the Table panel and row a list of columns and rows. This example query returns rows with the 6 specified columns:

```kusto
AzureActivity
| where $__timeFilter()
| project TimeGenerated, ResourceGroup, Category, OperationName, ActivityStatus, Caller
| order by TimeGenerated desc
```

### Time Series Queries

_Time Series_ queries are for the Graph Panel (and other panels like the Single Stat panel). The query must contain exactly one datetime column, one or more number valued columns, and optionally one more more string columns as labels. Here is an example query that returns the aggregated count grouped by the Category column and grouped by hour:

```kusto
AzureActivity
| where $__timeFilter(TimeGenerated)
| summarize count() by Category, bin(TimeGenerated, 1h)
| order by TimeGenerated asc
```

The number valued columns are considered metrics and the optional string columns are treated as tags. A time series is returned for each value column + unique set of string column values. Each series has name of valueColumnName {stringColumnName=columnValue, ... }.

For example, the following query will produce series like ` AvgDirectDeaths {EventType=Excessive Heat, State=DELAWARE}``EventCount {EventType=Excessive Heat, State=NEW JERSEY} `:

```kusto
StormEvents
| where $__timeFilter(StartTime)
| summarize EventCount=count(), AvgDirectDeaths=avg(DeathsDirect) by EventType, State, bin(StartTime, $__timeInterval)
| order by StartTime asc
```

### ADX Time Series Queries

_ADX Time Series_ are for queries that use the [Kusto `make-series` operator](https://docs.microsoft.com/en-us/azure/kusto/query/make-seriesoperator). The query must have exactly one datetime column named `Timestamp` and at least one value column. There may also optionally be string columns that will be labels.

Example:

```kusto
let T = range Timestamp from $__timeFrom to ($__timeTo + -30m) step 1m
  | extend   Person = dynamic(["Torkel", "Daniel", "Kyle", "Sofia"])
  | extend   Place  = dynamic(["EU",     "EU",     "US",   "EU"])
  | mvexpand Person, Place
  | extend   HatInventory = rand(5)
  | project  Timestamp, tostring(Person), tostring(Place), HatInventory;

T | make-series AvgHatInventory=avg(HatInventory) default=double(null) on Timestamp from $__timeFrom to $__timeTo step 1m by Person, Place
  | extend series_decompose_forecast(AvgHatInventory, 30) | project-away *residual, *baseline, *seasonal
```

### Trace Visualization Support

The trace format option can be used to display appropriately formatted data using the built in trace visualization. To use this visualization, data must be presented following the schema that is defined [here](https://grafana.com/docs/grafana/latest/explore/trace-integration/#data-frame-structure). The schema contains the `logs`, `serviceTags`, and `tags` fields which are expected to be JSON objects. These fields will be converted to the expected data structure provided the schema in ADX matches the below:

- `logs` - an array of JSON objects with a `timestamp` field that has a numeric value, and a `fields` field that is key-value object.
- `serviceTags` and `tags` - a typical key-value JSON object without nested objects.

The values for keys are expected to be primitive types rather than complex types. The correct value to pass when empty is either `null`, an empty JSON object for `serviceTags` and `tags`, or an empty array for `logs`.

### Time Macros

To make writing queries easier there are some Grafana macros that can be used in the where clause of a query:

- `$__timeFilter()` - Expands to `TimeGenerated ≥ datetime(2018-06-05T18:09:58.907Z) and TimeGenerated ≤ datetime(2018-06-05T20:09:58.907Z)` where the from and to datetimes are taken from the Grafana time picker.
- `$__timeFilter(datetimeColumn)` - Expands to `datetimeColumn ≥ datetime(2018-06-05T18:09:58.907Z) and datetimeColumn ≤ datetime(2018-06-05T20:09:58.907Z)` where the from and to datetimes are taken from the Grafana time picker.
- `$__timeFrom` - Expands to `datetime(2018-06-05T18:09:58.907Z)`, the start time of the query.
- `$__timeTo` - expands to `datetime(2018-06-05T20:09:58.907Z)`, the end time of the query.
- `$__timeInterval` - expands to `5000ms`, Grafana's recommended bin size based on the timespan of the query, in milliseconds. In alerting this will always be `1000ms`, it is recommended not to use this macro in alert queries.

### Templating Macros

- `$__escapeMulti($myVar)` - is to be used with multi-value template variables that contains illegal characters. If \$myVar has the value `'\\grafana-vm\Network(eth0)\Total','\\hello!'`, it expands to: `@'\\grafana-vm\Network(eth0)\Total', @'\\hello!'`. If using single value variables there no need for this macro, simply escape the variable inline instead - `@'\$myVar'`
- `$__contains(colName, $myVar)` - is to be used with multi-value template variables. If \$myVar has the value `'value1','value2'`, it expands to: `colName in ('value1','value2')`.

  If using the `All` option, then check the `Include All Option` checkbox and in the `Custom all value` field type in the following value: `all`. If \$myVar has value `all` then the macro will instead expand to `1 == 1`. For template variables with a lot of options, this will increase the query performance by not building a large where..in clause.

## Templating with Variables

Instead of hard-coding things like server, application and sensor name in your metric queries you can use variables in their place. Variables are shown as dropdown select boxes at the top of the dashboard. These dropdowns make it easy to change the data being displayed in your dashboard.

Create the variable in the dashboard settings. Usually you will need to write a query in the Kusto Query Language to get a list of values for the dropdown. It is however also possible to have a list of hard-coded values.

1. Fill in a name for your variable. The `Name` field is the name of the variable. There is also a `Label` field for the friendly name.
2. In the Query Options section, choose the `Azure Data Explorer` datasource in the `Data source` dropdown.
3. Write the query in the `Query` field. Use `project` to specify one column - the result should be a list of string values.

   ![Template Query](https://raw.githubusercontent.com/grafana/azure-data-explorer-datasource/main/src/img/templating_1.png)

4. At the bottom, you will see a preview of the values returned from the query:

   ![Template Query Preview](https://raw.githubusercontent.com/grafana/azure-data-explorer-datasource/main/src/img/templating_2.png)

5. Use the variable in your query (in this case the variable is named `level`):

   ```kusto
   MyLogs | where Level == '$level'
   ```

   For variables where multiple values are allowed then use the `in` operator instead:

   ```kusto
   MyLogs | where Level in ($level)
   ```

Read more about templating and variables in the [Grafana documentation](http://docs.grafana.org/reference/templating/#variables).

> **Note:** Usage of template variables in the _Builder_ is currently not supported.

## Databases Variable

There is no way to fetch a list of databases with the Kusto query language. When creating a template variable as described in the `Templating with variables` section, use the following function in the `Query` field to return a list of databases:

```sql
databases()
```

This variable can be used in the databases dropdown. This gives you the ability to switch databases without editing the query in the panel.

To use the variable, type the name of your variable into the dropdown. For example, if the name of your variable is `database`, then type `$database`.

## Annotations

An annotation is an event that is overlaid on top of graphs. The query can have up to three columns per row, the datetime column is mandatory. Annotation rendering is expensive so it is important to limit the number of rows returned.

- column with the datetime type.
- column with alias: Text or text for the annotation text
- column with alias: Tags or tags for annotation tags. This should return a comma separated string of tags e.g. 'tag1,tag2'

Example query:

```
MyLogs
| where $__timeFilter(Timestamp)
| project Timestamp, Text=Message , Tags="tag1,tag2"
```

## Query Builder - Data Types

The query builder provides an easy to use interface to query Azure Data Explorer. As of v4.1.0, columns of type `dynamic` are also appropriately supported within the query builder. Dynamically typed columns can now be queried using the `Where`, `Aggregate`, and `Group By` operations. When choosing one of these operations, the options will be populated based on the values within the dynamic column. This encompasses arrays, JSON objects, and nested objects within arrays. A limitation is only the first 50,000 rows are queried for data, so only properties contained within the first 50,000 rows will be listed as options in the builder selectors. Also, due to the fact that these queries make use of `mv-expand`, they may become resource intensive.

Note that only the 50,000 first rows of a table are evaluated in order to obtain possible values to show as options in the query builder. Additional values can be manually written in the different selectors if they don't appear by default.

See the below documentation for further details on how to handle dynamic columns appropriately via the KQL editor.

[Kusto Data Types](https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/scalar-data-types/) - Documentation on data types supported by Kusto.

[Dynamic Data Type](https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/scalar-data-types/dynamic) - Detailed documentation on the dynamic data type.

## CHANGELOG

See the [Changelog](https://github.com/grafana/azure-data-explorer-datasource/blob/main/CHANGELOG.md).
