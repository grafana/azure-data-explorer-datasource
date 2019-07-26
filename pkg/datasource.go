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
	plugin.logger.Debug("req", spew.Sdump(tsdbReq))
	plugin.logger.Debug("Query", "datasource", tsdbReq.Datasource.Name, "TimeRange", tsdbReq.TimeRange)

	client, err := azuredx.NewClient(ctx, tsdbReq.GetDatasource(), plugin.logger)
	if err != nil {
		return nil, err
	}

	for _, q := range tsdbReq.GetQueries() {
		qm := azuredx.QueryModel{}
		err := json.Unmarshal([]byte(q.GetModelJson()), &qm)
		if err != nil {
			return nil, err
		}

		switch qm.Format {
		case "test":
			err := client.TestRequest()
			if err != nil {
				plugin.logger.Debug("Test Case error", err)
				return nil, err
			}
			return response, nil
		case "table":
			plugin.logger.Debug("Query Case: Table")
			tables, err := client.TableRequest(qm.Query)
			if err != nil {
				return nil, err
			}
			gTables, err := tables.ToTables()
			if err != nil {
				return nil, err
			}
			if len(gTables) > 0 { // TODO(Not sure how to handle multiple tables yet)
				response.Results = append(response.Results, &datasource.QueryResult{Tables: []*datasource.Table{gTables[0]}})
			}
		case "time_series":
			plugin.logger.Debug("Query Case: Time Series")
			tables, err := client.TableRequest(qm.Query)
			if err != nil {
				return nil, err
			}
			series, err := tables.ToTimeSeries()
			if err != nil {
				return nil, err
			}
			response.Results = append(response.Results, &datasource.QueryResult{Series: series})
		case "time_series_adx_series":
			plugin.logger.Debug("Query Case: Time Series (ADX Series)")
			tables, err := client.TableRequest(qm.Query)
			if err != nil {
				return nil, err
			}
			series, err := tables.ToADXTimeSeries()
			if err != nil {
				return nil, err
			}
			response.Results = append(response.Results, &datasource.QueryResult{Series: series})
		default:
			return nil, fmt.Errorf("unsupported query type: '%v'", qm.QueryType)
		}

	}
	return response, nil
}
