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

func (plugin *GrafanaAzureDXDatasource) handleQuery(client *azuredx.Client, q backend.DataQuery) backend.DataResponse {
	resp := backend.DataResponse{}
	qm := &azuredx.QueryModel{}

	err := json.Unmarshal(q.JSON, qm)
	if err != nil {
		resp.Error = err
		return resp
	}

	qm.MacroData = azuredx.NewMacroData(&q.TimeRange, q.Interval.Microseconds())
	if err := qm.Interpolate(); err != nil {
		resp.Error = err
		return resp
	}
	md := &Metadata{
		RawQuery: qm.Query,
	}

	errorWithFrame := func(err error) {
		resp.Frames = append(resp.Frames, &data.Frame{RefID: q.RefID, Meta: &data.FrameMeta{Custom: md.CustomObject()}})
		resp.Error = err
	}

	var tableRes *azuredx.TableResponse
	tableRes, md.KustoError, err = client.KustoRequest(azuredx.RequestPayload{
		CSL: qm.Query,
		DB:  qm.Database,
	})

	if err != nil {
		errorWithFrame(err)
		return resp
	}

	if err != nil {
		log.Print.Debug("error building kusto request", err.Error())
		errorWithFrame(fmt.Errorf("%s: %s", err, md.KustoError))
		return resp
	}
	switch qm.Format {
	case "test":
		err := client.TestRequest()
		if err != nil {
			resp.Error = err
			return resp
		}
	case "table":
		resp.Frames, err = tableRes.ToDataFrames(md.CustomObject())
		if err != nil {
			log.Print.Debug("error converting response to data frames", err.Error())
			errorWithFrame(fmt.Errorf("error converting response to data frames: %w", err))
			return resp
		}
	case "time_series":
		frames, err := tableRes.ToDataFrames(md.CustomObject())
		if err != nil {
			errorWithFrame(err)
			return resp
		}
		for _, f := range frames {
			tsSchema := f.TimeSeriesSchema()
			if tsSchema.Type == data.TimeSeriesTypeNot {
				errorWithFrame(fmt.Errorf("returned frame is not a series"))
				return resp
			}
			if tsSchema.Type == data.TimeSeriesTypeLong {
				wideFrame, err := data.LongToWide(f, nil)
				if err != nil {
					errorWithFrame(err)
					return resp
				}
				f = wideFrame
			}
			resp.Frames = append(resp.Frames, f)
		}
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
		resp.Error = fmt.Errorf("unsupported query type: '%v'", qm.Format)
	}

	return resp
}

// QueryData is the primary method called by grafana-server
func (plugin *GrafanaAzureDXDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	res := backend.NewQueryDataResponse()

	log.Print.Debug("Query", "datasource", req.PluginContext.DataSourceInstanceSettings.Name)

	client, err := azuredx.NewClient(ctx, req.PluginContext.DataSourceInstanceSettings)
	if err != nil {
		return nil, err
	}

	for _, q := range req.Queries {
		res.Responses[q.RefID] = plugin.handleQuery(client, q)
	}

	return res, nil
}

// Metadata holds datasource metadata to send to the frontend
type Metadata struct {
	RawQuery   string
	KustoError string
	TimeNotASC bool
}

func (md *Metadata) CustomObject() map[string]interface{} {
	m := make(map[string]interface{}, 3)
	m["RawQuery"] = md.RawQuery
	m["KustoError"] = md.KustoError
	m["TimeNotASC"] = md.TimeNotASC
	return m
}
