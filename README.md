# Azure Data Explorer data source for Grafana

[![Build Status](https://drone.grafana.net/api/badges/grafana/azure-data-explorer-datasource/status.svg)](https://drone.grafana.net/grafana/azure-data-explorer-datasource)

[Azure Data Explorer](https://docs.microsoft.com/en-us/azure/data-explorer/) is a log analytics cloud platform optimized for ad-hoc big data queries.

## Installation

This plugin requires Grafana 8.0.0 or newer as of version 4.0.0 , it requires Grafana 7.1.0 or newer as of version 3.0.0. 
Plugin versions prior to 3.0.0 require Grafana 6.3.6.

## Grafana Cloud

If you do not have a [Grafana Cloud](https://grafana.com/cloud) account, you can sign up for one [here](https://grafana.com/cloud/grafana).

1. Click on the `Install plugin` button on the [Azure Data Explorer page on Grafana.com](https://grafana.com/plugins/grafana-azure-data-explorer-datasource/?tab=installation). This will automatically add the plugin to your Grafana instance. It might take up to 30 seconds to install.

2. Login to your Hosted Grafana instance (go to your instances page in your profile): `https://grafana.com/orgs/<yourUserName>/instances/` and the Azure Data Explorer datasource will be installed.

### Installation Instructions on the Grafana Docs Site

- [Installing on Debian/Ubuntu](http://docs.grafana.org/installation/debian/)
- [Installing on RPM-based Linux (CentOS, Fedora, OpenSuse, RedHat)](http://docs.grafana.org/installation/rpm/)
- [Installing on Windows](http://docs.grafana.org/installation/windows/)
- [Installing on Mac](http://docs.grafana.org/installation/mac/)

### Docker

1. Fetch the latest version of grafana from Docker Hub:
   `docker pull grafana/grafana:latest`
2. Run Grafana and install the Azure Data Explorer plugin with this command:

   ```bash
   docker run -d --name=grafana -p 3000:3000 -e "GF_INSTALL_PLUGINS=grafana-azure-data-explorer-datasource" grafana/grafana:latest
   ```

3. Open the browser at: <http://localhost:3000> or <http://your-domain-name:3000>
4. Login in with username: `admin` and password: `admin`
5. To make sure the plugin was installed, check the list of installed datasources. Click the Plugins item in the main menu. Both core datasources and installed datasources will appear.

This ia an alternative command if you want to run Grafana on a different port than the default 3000 port:

```bash
docker run -d --name=grafana -p 8081:8081 -e "GF_SERVER_HTTP_PORT=8081" -e "GF_INSTALL_PLUGINS=grafana-azure-data-explorer-datasource" grafana/grafana:master
```

It is recommended that you use a volume to save the Grafana data in. Otherwise if you remove the docker container, you will lose all your Grafana data (dashboards, users etc.). You can create a volume with the [Docker Volume Driver for Azure File Storage](https://github.com/Azure/azurefile-dockervolumedriver).

### Installing the Plugin on an Existing Grafana with the CLI

Grafana comes with a command line tool that can be used to install plugins.

1. Upgrade Grafana to the latest version. Get that [here](https://grafana.com/grafana/download/).
2. Run this command: `grafana-cli plugins install grafana-azure-data-explorer-datasource`
3. Restart the Grafana server.
4. Open the browser at: <http://localhost:3000> or <http://your-domain-name:3000>
5. Login in with a user that has admin rights. This is needed to create datasources.
6. To make sure the plugin was installed, check the list of installed datasources. Click the Plugins item in the main menu. Both core datasources and installed datasources will appear.

### Installing the Plugin Manually on an Existing Grafana

If the server where Grafana is installed has no access to the Grafana.com server, then the plugin can be downloaded and manually copied to the server.

1. Upgrade Grafana to the latest version. Get that [here](https://grafana.com/grafana/download/).
2. Get the zip file from Grafana.com: <https://grafana.com/plugins/grafana-azure-data-explorer-datasource/installation> and click on the link in step 1 (with this text: "Alternatively, you can manually download the .zip file")
3. Extract the zip file into the data/plugins subdirectory for Grafana.
4. Restart the Grafana server
5. To make sure the plugin was installed, check the list of installed datasources. Click the Plugins item in the main menu. Both core datasources and installed datasources will appear.

## Configuring the datasource in Grafana

The steps for configuring the integration between the Azure Data Explorer service and Grafana are:

1. Create an Azure Active Directory (AAD) Application and AAD Service Principle.
2. Log into the Azure Data Explorer WebExplorer and connect the AAD Application to an Azure Data Explorer database user.
3. Use the AAD Application to configure the datasource connection in Grafana.

### Creating an Azure Active Directory Service Principle

Follow the instructions in the [guide to setting up an Azure Active Directory Application.](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal)

An alternative way to create an AAD application is with the [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest#az-ad-sp-create-for-rbac):

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

Navigate to the Azure Web UI for Azure Data Explorer: <https://dataexplorer.azure.com/clusters/nameofyourcluster/databases/yourdatabasename>

You can find the link to the Web UI in the Azure Portal by navigating to:

1. All services-> [Azure Data Explorer Clusters](https://portal.azure.com/?feature.customportal=false&Microsoft_Azure_Kusto=true#blade/HubsExtension/Resources/resourceType/Microsoft.Kusto%2FClusters) option
2. Choose your cluster
3. Databases -> click on your database
4. Choose the Query option -> then click on the "Open in web UI" link

To create a cluster and database, follow the instructions [here](https://docs.microsoft.com/en-us/azure/data-explorer/create-cluster-database-portal).

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

2. Select Azure Data Explorer Datasource from the datasource list:

   ![Data Source Type](https://raw.githubusercontent.com/grafana/azure-data-explorer-datasource/main/src/img/config_1_select_type.png)

3. In the name field, a default name is filled in automatically but it can be changed to anything.

4. You need 3 pieces of information from the Azure portal (see link above for detailed instructions):

   - **Tenant Id** (Azure Active Directory -> Properties -> Directory ID)
   - **Client Id** (Azure Active Directory -> App Registrations -> Choose your app -> Application ID)
   - **Client Secret** ( Azure Active Directory -> App Registrations -> Choose your app -> Keys)

5. Paste these three items into the fields in the Azure Data Explorer API Details section:
   ![Azure Data Explorer API Details](https://raw.githubusercontent.com/grafana/azure-data-explorer-datasource/main/src/img/config_2_azure_data_explorer_api_details.png)

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

### Time Macros

To make writing queries easier there are two Grafana macros that can be used in the where clause of a query:

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

<!-- TODO: Update the paragraph below once #353 is fixed -->

The query builder provides an easy to use interface to query Azure Data Explorer. However, there are limitations on the supported data types that a column can possess. Currently, if a column is typed as `dynamic` it is fully not included as an option for the following operations: `Where`, `Aggregate`, `Group by`. The reason for this is that columns of type `dynamic` can potentially contain values that have any of the primitive data types, but also arrays (where the array can then have values of any type) and JSON objects. The query builder does not currently support querying values that are either arrays or JSON objects.

Note that only the 50.000 first rows of a table are evaluated in order to obtain possible values to show as options in the query builder. Additional values can be manually written in the different selectors if they don't appear by default.

See the below documentation for further details on how to handle dynamic columns appropriately via the KQL editor.

[Kusto Data Types](https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/scalar-data-types/) - Documentation on data types supported by Kusto.

[Dynamic Data Type](https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/scalar-data-types/dynamic) - Detailed documentation on the dynamic data type.

## CHANGELOG

See the [Changelog](https://github.com/grafana/azure-data-explorer-datasource/blob/main/CHANGELOG.md).
