package main

import (
	"encoding/json"
	"fmt"

	"github.com/davecgh/go-spew/spew"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx"
	"github.com/grafana/grafana_plugin_model/go/datasource"
	hclog "github.com/hashicorp/go-hclog"
	plugin "github.com/hashicorp/go-plugin"
	"golang.org/x/net/context"
)

// GrafanaAzureDXDatasource stores reference to plugin and logger
type GrafanaAzureDXDatasource struct {
	plugin.NetRPCUnsupportedPlugin
	logger hclog.Logger
}

// Query Primary method called by grafana-server
func (plugin *GrafanaAzureDXDatasource) Query(ctx context.Context, tsdbReq *datasource.DatasourceRequest) (*datasource.DatasourceResponse, error) {
	response := &datasource.DatasourceResponse{}
	// testapi := servicenow.TestServiceNowAPI(nil, plugin.logger)
	// if !testapi {
	// 	plugin.logger.Error("Query", "datasource", tsdbReq.Datasource.Name, "Error connecting")
	// }
	plugin.logger.Debug("req", spew.Sdump(tsdbReq))
	plugin.logger.Debug("Query", "datasource", tsdbReq.Datasource.Name, "TimeRange", tsdbReq.TimeRange)

	client, err := azuredx.NewClient(ctx, tsdbReq.GetDatasource())
	if err != nil {
		return nil, err
	}

	for _, q := range tsdbReq.GetQueries() {
		qm := azuredx.QueryModel{}
		err := json.Unmarshal([]byte(q.GetModelJson()), &qm)
		if err != nil {
			return nil, err
		}

		switch qm.QueryType {
		case "test":
			plugin.logger.Debug("Query Case: Test")
			tables, err := client.TestRequest()
			if err != nil {
				return nil, err
			}

			plugin.logger.Debug("Test Response", spew.Sdump(tables))
		default:
			return nil, fmt.Errorf("unsupported query type: '%v'", qm.QueryType)
		}

	}
	simpleQuery()
	return response, nil
}

func simpleQuery() {
	fmt.Println("Hi!")
}
