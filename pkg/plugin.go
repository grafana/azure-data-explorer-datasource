package main

import (
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func main() {
	backend.SetupPluginEnvironment("grafana-azure-data-explorer-datasource")

	err := backend.Serve(backend.ServeOpts{
		QueryDataHandler: &GrafanaAzureDXDatasource{},
	})

	if err != nil {
		backend.Logger.Error(err.Error())
		os.Exit(1)
	}
}
