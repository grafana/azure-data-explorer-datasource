package main

import (
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func main() {
	backend.SetupPluginEnvironment("grafana-azure-data-explorer-datasource")

	adx := &GrafanaAzureDXDatasource{}
	err := backend.Serve(backend.ServeOpts{
		QueryDataHandler:   adx,
		CheckHealthHandler: adx,
	})

	if err != nil {
		backend.Logger.Error(err.Error())
		os.Exit(1)
	}
}
