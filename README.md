# Azure Data Explorer data source for Grafana

[Azure Data Explorer](https://learn.microsoft.com/en-us/azure/data-explorer/) is a fast, fully managed data analytics service for real-time analysis of large volumes of data. This plugin lets you query and visualize Azure Data Explorer data in Grafana using the visual query builder or Kusto Query Language (KQL).

## Documentation

Full documentation for the Azure Data Explorer data source is available on the Grafana website:

- [Overview](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/)
- [Configure the data source](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/configure/) - Connection, authentication (App Registration, Managed Identity, Workload Identity, Current User with fallback service credentials, and On-Behalf-Of), provisioning, and trusted endpoints.
- [Query editor](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/query-editor/) - Visual query builder, KQL, the OpenAI query generator, formats, and macros.
- [Template variables](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/template-variables/)
- [Annotations](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/annotations/)
- [Alerting](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/alerting/)
- [Troubleshooting](https://grafana.com/docs/plugins/grafana-azure-data-explorer-datasource/latest/troubleshooting/)

## Requirements

- Grafana 11.6.11 or later.
- A Grafana Cloud Pro or Advanced plan, or a Grafana Enterprise license. The Azure Data Explorer data source is an Enterprise plugin.

## Installation

For detailed instructions on how to install the plugin on Grafana Cloud or locally, refer to the [Plugin installation docs](https://grafana.com/docs/grafana/latest/administration/plugin-management/).

## Contributing

- [Contributing guide](https://github.com/grafana/azure-data-explorer-datasource/blob/main/CONTRIBUTING.md)
- [Report an issue](https://github.com/grafana/azure-data-explorer-datasource/issues)
- [CHANGELOG](https://github.com/grafana/azure-data-explorer-datasource/blob/main/CHANGELOG.md)

## License

[Apache License 2.0](https://github.com/grafana/azure-data-explorer-datasource/blob/main/LICENSE)
