package main

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx"
	"github.com/grafana/azure-data-explorer-datasource/pkg/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	plugin "github.com/hashicorp/go-plugin"
	"golang.org/x/net/context"
)

// GrafanaAzureDXDatasource stores reference to plugin and logger
type GrafanaAzureDXDatasource struct {
	plugin.NetRPCUnsupportedPlugin
}

// Query is the primary method called by grafana-server
func (plugin *GrafanaAzureDXDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	response := &backend.QueryDataResponse{}

	log.Print.Debug("Query", "datasource", req.PluginConfig.DataSourceConfig.Name)

	client, err := azuredx.NewClient(ctx, req.PluginConfig.DataSourceConfig)
	if err != nil {
		return nil, err
	}

	for _, q := range req.Queries {
		qm := &azuredx.QueryModel{}
		err := json.Unmarshal(q.JSON, qm)
		if err != nil {
			return nil, err
		}
		log.Print.Debug(fmt.Sprintf("Query ---> %v", q))
		qm.MacroData = azuredx.NewMacroData(&q.TimeRange, q.Interval.Microseconds())
		if err := qm.Interpolate(); err != nil {
			return nil, err
		}
		md := &Metadata{
			RawQuery: qm.Query,
		}
		var tableRes *azuredx.TableResponse
		tableRes, md.KustoError, err = client.KustoRequest(azuredx.RequestPayload{
			CSL: qm.Query,
			DB:  qm.Database,
		})
		if err != nil {
			response.Frames = append(response.Frames, errorDF(err.Error(), q.RefID, md.CustomObject()))
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
			frames, err := tableRes.ToFrames(q.RefID, md.CustomObject())
			if err != nil {
				response.Frames = append(response.Frames, frames...)
			}
			// gTables, err := tableRes.ToTables()
			// if err != nil {
			// 	qr.Error = err.Error()
			// 	break
			// }
			// qr.Tables = gTables
		// case "time_series":
		// 	series, timeNotASC, err := tableRes.ToTimeSeries()
		// 	if err != nil {
		// 		qr.Error = err.Error()
		// 		break
		// 	}
		// 	md.TimeNotASC = timeNotASC
		// 	qr.Series = series
		// case "time_series_adx_series":
		// 	series, err := tableRes.ToADXTimeSeries()
		// 	if err != nil {
		// 		qr.Error = err.Error()
		// 		break
		// 	}
		// 	qr.Series = series
		default:
			return nil, fmt.Errorf("unsupported query type: '%v'", qm.Format)
		}
	}
	return response, nil
}

// Metadata holds datasource metadata to send to the frontend
type Metadata struct {
	RawQuery   string
	KustoError string
	TimeNotASC bool
}

// JSONString performs a json.Marshal on the metadata object and returns the JSON as a string.
func (md *Metadata) JSONString() (string, error) {
	b, err := json.Marshal(md)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (md *Metadata) CustomObject() map[string]interface{} {
	m := make(map[string]interface{}, 3)
	m["RawQuery"] = md.RawQuery
	m["KustoError"] = md.KustoError
	m["TimeNotASC"] = md.TimeNotASC
	return m
}

// Make a dataframe for an error, sdk needs some love here.
func errorDF(msg, refID string, customMD map[string]interface{}) *data.Frame {
	f := &data.Frame{
		Name:  "error",
		RefID: refID,
		Meta: &data.QueryResultMeta{
			Custom: customMD,
		},
	}
	f.AppendWarning(msg, "")
	return f
}
