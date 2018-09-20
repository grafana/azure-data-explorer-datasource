# Azure Kusto Data Source For Grafana

Azure Kusto is a log analytics cloud platform optimized for ad-hoc big data queries.

## Features

## Installation

This plugin requires Grafana 5.3.0 or newer.

## Grafana Cloud

If you do not have a [Grafana Cloud](https://grafana.com/cloud) account, you can sign up for one [here](https://grafana.com/cloud/grafana).

1. Click on the `Install Now` button on the [Azure Kusto page on Grafana.com](https://grafana.com/plugins/grafana-azure-kusto-datasource/installation). This will automatically add the plugin to your Gr$
fana instance. It might take up to 30 seconds to install.
    ![GrafanaCloud Install](https://raw.githubusercontent.com/grafana/azure-kusto-datasource/master/dist/img/grafana_cloud_install.png)

2. Login to your Hosted Grafana instance (go to your instances page in your profile): `https://grafana.com/orgs/<yourUserName>/instances/` and the Azure Kusto datasource will be installed.

### Installation Instructions on the Grafana Docs Site

- [Installing on Debian/Ubuntu](http://docs.grafana.org/installation/debian/)
- [Installing on RPM-based Linux (CentOS, Fedora, OpenSuse, RedHat)](http://docs.grafana.org/installation/rpm/)
- [Installing on Windows](http://docs.grafana.org/installation/windows/)
- [Installing on Mac](http://docs.grafana.org/installation/mac/)

### Docker

1. Fetch the latest version of grafana from Docker Hub:
    `docker pull grafana/grafana:latest`
2. Run Grafana and install the Azure Kusto plugin with this command:
    ```bash
    docker run -d --name=grafana -p 3000:3000 -e "GF_INSTALL_PLUGINS=grafana-azure-kusto-datasource" grafana/grafana:latest
    ```
3. Open the browser at: http://localhost:3000 or http://your-domain-name:3000
4. Login in with username: `admin` and password: `admin`
5. To make sure the plugin was installed, check the list of installed data sources. Click the Plugins item in the main menu. Both core data sources and installed data sources will appear.

This ia an alternative command if you want to run Grafana on a different port than the default 3000 port:

```bash
docker run -d --name=grafana -p 8081:8081 -e "GF_SERVER_HTTP_PORT=8081" -e "GF_INSTALL_PLUGINS=grafana-azure-kusto-datasource" grafana/grafana:master
```

It is recommended that you use a volume to save the Grafana data in. Otherwise if you remove the docker container, you will lose all your Grafana data (dashboards, users etc.). You can create a volume with the [Docker Volume Driver for Azure File Storage](https://github.com/Azure/azurefile-dockervolumedriver).

### Installing the Plugin on an Existing Grafana with the CLI

Grafana comes with a command line tool that can be used to install plugins.

1. Upgrade Grafana to the latest version. Get that [here](https://grafana.com/grafana/download/).
2. Run this command: `grafana-cli plugins install grafana-azure-kusto-datasource`
3. Restart the Grafana server.
4. Open the browser at: http://localhost:3000 or http://your-domain-name:3000
5. Login in with a user that has admin rights. This is needed to create data sources.
6. To make sure the plugin was installed, check the list of installed data sources. Click the Plugins item in the main menu. Both core data sources and installed data sources will appear.

### Installing the Plugin Manually on an Existing Grafana

If the server where Grafana is installed has no access to the Grafana.com server, then the plugin can be downloaded and manually copied to the server.

1. Upgrade Grafana to the latest version. Get that [here](https://grafana.com/grafana/download/).
2. Get the zip file from Grafana.com: https://grafana.com/plugins/grafana-azure-kusto-datasource/installation and click on the link in step 1 (with this text: "Alternatively, you can manually download the .zip file")
3. Extract the zip file into the data/plugins subdirectory for Grafana.
4. Restart the Grafana server
5. To make sure the plugin was installed, check the list of installed data sources. Click the Plugins item in the main menu. Both core data sources and installed data sources will appear.

## Configuring the datasource in Grafana

The steps for configuring the integration between the Azure Kusto service and Grafana are:

1. Create an Azure Active Directory (AAD) Application and AAD Service Principle.
2. Log into the Azure Log Analytics Portal and connect the AAD Application to an Azure Kusto database user.
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

### Connecting AAD with an Azure Kusto User

Navigate to the Kusto Web Explorer: http://nameofyourcluster.kusto.windows.net?web=1

The AAD application that you created above needs to be given viewer access to your Kusto database (in this example the database is called Grafana). This is done using the dot command `add`. The argument for `.add` contains both the client and tenant id separated by a semicolon:

```sql
.add database Grafana viewers ('aadapp=<your client id>;<your tenantid>')
```

A real example with a client/app id and tenant id:
```sql
.add database Grafana viewers ('aadapp=377a87d4-2cd3-44c0-b35a-8887a12fxxx;e7f3f661-a933-4b3f-8176-51c4f982exxx')
```

If the command succeeds you should get a result like this:

 ![Kusto Web Explorer Add result](https://raw.githubusercontent.com/grafana/azure-kusto-datasource/master/src/img/config_3_kusto_web_explorer.png)

### Configuring Grafana

1. Accessed from the Grafana main menu, newly installed data sources can be added immediately within the Data Sources section. Next, click the  "Add data source" button in the upper right. The data source will be available for selection in the Type select box.

2. Select Azure Kusto from the Type dropdown:
![Data Source Type](https://raw.githubusercontent.com/grafana/azure-kusto-datasource/master/src/img/config_1_select_type.png)
3. In the name field, fill in a name for the data source. It can be anything.

4. You need 4 pieces of information from the Azure portal (see link above for detailed instructions):
    - **Tenant Id** (Azure Active Directory -> Properties -> Directory ID)
    - **Subscription Id** (Subscriptions -> Choose subscription -> Overview -> Subscription ID)
    - **Client Id** (Azure Active Directory -> App Registrations -> Choose your app -> Application ID)
    - **Client Secret** ( Azure Active Directory -> App Registrations -> Choose your app -> Keys)

5. Paste these four items into the fields in the Azure Kusto API Details section:
    ![Azure Kusto API Details](https://raw.githubusercontent.com/grafana/azure-kusto-datasource/master/src/img/config_2_azure_kusto_api_details.png)

6. Click the `Save & Test` button. After a few seconds once Grafana has successfully connected then choose the default database and save again.

## Writing Queries

Queries are written in the new [Kusto Query Language](https://kusdoc2.azurewebsites.net/docs/query/index.html).

Queries can be formatted as *Time Series* data or as *Table* data.

*Time Series* queries are for the Graph Panel (and other panels like the Single Stat panel) and must contain a datetime column, a metric name column and a value column. Here is an example query that returns the aggregated count grouped by the Category column and grouped by hour:

```
AzureActivity
| where $__timeFilter(TimeGenerated)
| summarize count() by Category, bin(TimeGenerated, 1h)
| order by TimeGenerated asc
```

*Table* queries are mainly used in the Table panel and row a list of columns and rows. This example query returns rows with the 6 specified columns:

```
AzureActivity
| where $__timeFilter()
| project TimeGenerated, ResourceGroup, Category, OperationName, ActivityStatus, Caller
| order by TimeGenerated desc
```

### Macros

To make writing queries easier there are two Grafana macros that can be used in the where clause of a query:

- $__timeFilter() - Expands to `TimeGenerated ≥ datetime(2018-06-05T18:09:58.907Z) and TimeGenerated ≤ datetime(2018-06-05T20:09:58.907Z)` where the from and to datetimes are taken from the Grafana time picker.
- $__timeFilter(datetimeColumn) - Expands to `datetimeColumn ≥ datetime(2018-06-05T18:09:58.907Z) and datetimeColumn ≤ datetime(2018-06-05T20:09:58.907Z)` where the from and to datetimes are taken from the Grafana time picker.

### Builtin Variables

There are also some Grafana variables that can be used in queries:

- **$__from** - Returns the From datetime from the Grafana picker. Example: datetime(2018-06-05T18:09:58.907Z).
- **$__to** - Returns the From datetime from the Grafana picker. Example: datetime(2018-06-05T20:09:58.907Z).
- **$__interval** - Grafana calculates the minimum time grain that can be used to group by time in queries. More details on how it works here. It returns a time grain like 5m or 1h that can be used in the bin function. E.g. `summarize count() by bin(TimeGenerated, $__interval)`

## Templating with Variables

Instead of hard-coding things like server, application and sensor name in you metric queries you can use variables in their place. Variables are shown as dropdown select boxes at the top of the dashboard. These dropdowns make it easy to change the data being displayed in your dashboard.

Create the variable in the dashboard settings. Usually you will need to write a query in the Kusto Query Language to get a list of values for the dropdown. It is however also possible to have a list of hardcoded values.

1. Fill in a name for your variable. The `Name` field is the name of the variable. There is also a `Label` field for the friendly name.
2. In the Query Options section, choose the `Azure Kusto` datasource in the `Data source` dropdown.
3. Write the query in the `Query` field.
    ![Template Query](https://raw.githubusercontent.com/grafana/azure-kusto-datasource/master/src/img/templating_1.png)
4. At the bottom, you will see a preview of the values returned from the query:
    ![Template Query Preview](https://raw.githubusercontent.com/grafana/azure-kusto-datasource/master/src/img/templating_2.png)
5. Use the variable in your query (in this case the variable is named `level`):

    ```
    MyLogs | where Level == '$level'
    ```

For variables where multiple values are allowed then use the `in` operator instead:

    ```
    MyLogs | where Level in ($level)
    ```

Read more about templating and variables in the [Grafana documentation](http://docs.grafana.org/reference/templating/#variables).

## Annotations

An annotation is an event that is overlaid on top of graphs. The query can have up to three columns per row, the datetime column is mandatory. Annotation rendering is expensive so it is important to limit the number of rows returned.

- column with the datetime type.
- column with alias: Text or text for the annotation text
- column with alias: Tags or tags for annotation tags. This is should return a comma separated string of tags e.g. 'tag1,tag2'

Example query:

```
MyLogs
| where $__timeFilter(Timestamp) 
| project Timestamp, Text=Message , Tags="tag1,tag2"
```

### CHANGELOG

#### v1.0.0

First version of the Azure Kusto Datasource.
