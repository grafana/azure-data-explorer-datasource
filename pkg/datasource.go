package main

import (
	"encoding/json"
	"fmt"

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

// Query is the primary method called by grafana-server
func (plugin *GrafanaAzureDXDatasource) Query(ctx context.Context, tsdbReq *datasource.DatasourceRequest) (*datasource.DatasourceResponse, error) {
	response := &datasource.DatasourceResponse{}
	plugin.logger.Debug("Query", "datasource", tsdbReq.Datasource.Name, "TimeRange", tsdbReq.TimeRange)

	client, err := azuredx.NewClient(ctx, tsdbReq.GetDatasource(), plugin.logger)
	if err != nil {
		return nil, err
	}

	for idx, q := range tsdbReq.GetQueries() {
		qm := &azuredx.QueryModel{}
		err := json.Unmarshal([]byte(q.GetModelJson()), qm)
		if err != nil {
			return nil, err
		}
		qm.MacroData = azuredx.NewMacroData(tsdbReq.GetTimeRange(), q.GetIntervalMs())
		if err := qm.Interpolate(); err != nil {
			return nil, err
		}
		tableRes, err := client.KustoRequest(qm.Query)
		if err != nil {
			return nil, err
		}
		switch qm.Format {
		case "test":
			err := client.TestRequest()
			if err != nil {
				return nil, err
			}
			return response, nil
		case "table":
			gTables, err := tableRes.ToTables()
			if err != nil {
				return nil, err
			}
			if len(gTables) > 0 { // TODO(Not sure how to handle multiple tables yet)
				response.Results = append(response.Results, &datasource.QueryResult{Tables: []*datasource.Table{gTables[0]}})
			}
		case "time_series":
			series, err := tableRes.ToTimeSeries()
			if err != nil {
				return nil, err
			}
			response.Results = append(response.Results, &datasource.QueryResult{Series: series})
		case "time_series_adx_series":
			series, err := tableRes.ToADXTimeSeries()
			if err != nil {
				return nil, err
			}
			response.Results = append(response.Results, &datasource.QueryResult{Series: series})
		default:
			return nil, fmt.Errorf("unsupported query type: '%v'", qm.QueryType)
		}

		metaData := struct {
			RawQuery string
		}{
			qm.Query.CSL,
		}
		if jB, err := json.Marshal(metaData); err != nil {
			plugin.logger.Debug("could not add metadata") // only log since this is just metadata
		} else {
			response.Results[idx].MetaJson = string(jB)
		}

		response.Results[idx].RefId = q.GetRefId()

	}
	return response, nil
}
