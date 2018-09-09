# Azure Kusto Data Source For Grafana

Azure Kusto is a log analytics cloud platform optimized for ad-hoc big data queries.

## Features

## Installation

This plugin requires Grafana 5.3.0 or newer.

## Grafana Cloud

If you do not have a [Grafana Cloud](https://grafana.com/cloud) account, you can sign up for one [here](https://grafana.com/cloud/grafana).

1. Click on the `Install Now` button on the [Azure Monitor page on Grafana.com](https://grafana.com/plugins/grafana-azure-monitor-datasource/installation). This will automatically add the plugin to your Gr$
fana instance. It might take up to 30 seconds to install.
    ![GrafanaCloud Install](https://raw.githubusercontent.com/grafana/azure-monitor-datasource/master/dist/img/grafana_cloud_install.png)

2. Login to your Hosted Grafana instance (go to your instances page in your profile): `https://grafana.com/orgs/<yourUserName>/instances/` and the Azure Monitor data source will be installed.

### Installation Instructions on the Grafana Docs Site

- [Installing on Debian/Ubuntu](http://docs.grafana.org/installation/debian/)
- [Installing on RPM-based Linux (CentOS, Fedora, OpenSuse, RedHat)](http://docs.grafana.org/installation/rpm/)
- [Installing on Windows](http://docs.grafana.org/installation/windows/)
- [Installing on Mac](http://docs.grafana.org/installation/mac/)

### Docker

1. Fetch the latest version of grafana from Docker Hub:
    `docker pull grafana/grafana:latest`
2. Run Grafana and install the Azure Monitor plugin with this command:
    ```bash
    docker run -d --name=grafana -p 3000:3000 -e "GF_INSTALL_PLUGINS=grafana-azure-kusto-datasource" grafana/grafana:latest
    ```
3. Open the browser at: http://localhost:3000 or http://your-domain-name:3000
4. Login in with username: `admin` and password: `admin`
5. To make sure the plugin was installed, check the list of installed data sources. Click the Plugins item in the main menu. Both core data sources and installed data sources will appear.

This ia an alternative command if you want to run Grafana on a different port than the default 3000 port:

```bash
docker run -d --name=grafana -p 8081:8081 -e "GF_SERVER_HTTP_PORT=8081" -e "GF_INSTALL_PLUGINS=grafana-azure-monitor-datasource" grafana/grafana:master
```

It is recommended that you use a volume to save the Grafana data in. Otherwise if you remove the docker container, you will lose all your Grafana data (dashboards, users etc.). You can create a volume with the [Docker Volume Driver for Azure File Storage](https://github.com/Azure/azurefile-dockervolumedriver).

### Installing the Plugin on an Existing Grafana with the CLI

Grafana comes with a command line tool that can be used to install plugins.

1. Upgrade Grafana to the latest version. Get that [here](https://grafana.com/grafana/download/).
2. Run this command: `grafana-cli plugins install grafana-azure-monitor-datasource`
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

## Configure the data source





### CHANGELOG

#### v1.0.0

First version of the Azure Kusto Datasource.
