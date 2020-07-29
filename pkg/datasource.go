package main

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"golang.org/x/net/context"
)

// GrafanaAzureDXDatasource stores reference to plugin and logger
type GrafanaAzureDXDatasource struct{}

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

	interpolatedQuery := qm.Query
	var kustoError string
	errorWithFrame := func(err error) {
		fm := &data.FrameMeta{ExecutedQueryString: interpolatedQuery}
		if kustoError != "" {
			fm.Custom = struct {
				KustoError string
			}{
				kustoError,
			}
		}
		resp.Frames = append(resp.Frames, &data.Frame{RefID: q.RefID, Meta: fm})
		resp.Error = err
	}

	var tableRes *azuredx.TableResponse
	tableRes, kustoError, err = client.KustoRequest(azuredx.RequestPayload{
		CSL: qm.Query,
		DB:  qm.Database,
	})

	if err != nil {
		backend.Logger.Debug("error building kusto request", "error", err.Error())
		errorWithFrame(err)
		return resp
	}
	switch qm.Format {
	case "table":
		resp.Frames, err = tableRes.ToDataFrames(interpolatedQuery)
		if err != nil {
			backend.Logger.Debug("error converting response to data frames", "error", err.Error())
			errorWithFrame(fmt.Errorf("error converting response to data frames: %w", err))
			return resp
		}
	case "time_series":
		frames, err := tableRes.ToDataFrames(interpolatedQuery)
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
	case "time_series_adx_series":
		orginalDFs, err := tableRes.ToDataFrames(interpolatedQuery)
		if err != nil {
			errorWithFrame(fmt.Errorf("error converting response to data frames: %w", err))
			return resp
		}
		for _, f := range orginalDFs {
			formatedDF, err := azuredx.ToADXTimeSeries(f)
			if err != nil {
				errorWithFrame(err)
				return resp
			}
			resp.Frames = append(resp.Frames, formatedDF)
		}

	// 	series, timeNotASC, err := tableRes.ToTimeSeries()
	// 	if err != nil {
	// 		qr.Error = err.Error()
	// 		break
	// 	}
	// 	md.TimeNotASC = timeNotASC
	// 	qr.Series = series

	default:
		resp.Error = fmt.Errorf("unsupported query type: '%v'", qm.Format)
	}

	return resp
}

// QueryData is the primary method called by grafana-server
func (plugin *GrafanaAzureDXDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	res := backend.NewQueryDataResponse()

	backend.Logger.Debug("Query", "datasource", req.PluginContext.DataSourceInstanceSettings.Name)

	client, err := azuredx.NewClient(ctx, req.PluginContext.DataSourceInstanceSettings)
	if err != nil {
		return nil, err
	}

	for _, q := range req.Queries {
		res.Responses[q.RefID] = plugin.handleQuery(client, q)
	}

	return res, nil
}

// CheckHealth handles health checks
func (plugin *GrafanaAzureDXDatasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {

	client, err := azuredx.NewClient(ctx, req.PluginContext.DataSourceInstanceSettings)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: err.Error(),
		}, nil
	}

	err = client.TestRequest()
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: err.Error(),
		}, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: fmt.Sprintf("Success"),
	}, nil
}
