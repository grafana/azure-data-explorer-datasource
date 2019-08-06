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
	response := &datasource.DatasourceResponse{
		Results: make([]*datasource.QueryResult, len(tsdbReq.Queries)),
	}

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
		md := &Metadata{
			RawQuery: qm.Query,
		}
		qr := &datasource.QueryResult{
			RefId: q.GetRefId(),
		}
		response.Results[idx] = qr
		var tableRes *azuredx.TableResponse
		tableRes, md.KustoError, err = client.KustoRequest(azuredx.RequestPayload{
			CSL: qm.Query,
			DB:  qm.Database,
		})
		if err != nil {
			qr.Error = err.Error()
			mdString, jsonErr := md.JSONString()
			if jsonErr != nil {
				plugin.logger.Debug("failed to marshal metadata", jsonErr)
				continue
			}
			qr.MetaJson = mdString
			continue
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
				qr.Error = err.Error()
				break
			}
			qr.Tables = gTables
		case "time_series":
			series, err := tableRes.ToTimeSeries()
			if err != nil {
				qr.Error = err.Error()
				break
			}
			qr.Series = series
		case "time_series_adx_series":
			series, err := tableRes.ToADXTimeSeries()
			if err != nil {
				qr.Error = err.Error()
				break
			}
			qr.Series = series
		default:
			return nil, fmt.Errorf("unsupported query type: '%v'", qm.Format)
		}

		if qr.MetaJson == "" {
			mdString, err := md.JSONString()
			if err != nil {
				plugin.logger.Debug("could not add metadata", err) // only log since this is just metadata
				continue
			}
			qr.MetaJson = mdString
		}
	}
	return response, nil
}

// Metadata holds datasource metadata to send to the frontend
type Metadata struct {
	RawQuery   string
	KustoError string
}

// JSONString performs a json.Marshal on the metadata object and returns the JSON as a string.
func (md *Metadata) JSONString() (string, error) {
	b, err := json.Marshal(md)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
