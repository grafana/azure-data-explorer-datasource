# k6 End-to-End Tests

## Prerequisites

- [K6](https://k6.io/docs/get-started/installation/)
- [Grafana](https://grafana.com/docs/grafana/latest/installation/)
- [Azure Data Explorer](https://docs.microsoft.com/en-us/azure/data-explorer/create-cluster-database-portal)

## Running the tests

1. Ensure Grafana is running on port `:3000`
1. Ensure you have the relevant environment variables set
1. Run `yarn test:e2e`

## Setting the environment variables

The following environment variables are required to run the tests:

...
