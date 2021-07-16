package azuredx

import (
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/client"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/tokenprovider"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	sdkhttpclient "github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	jsoniter "github.com/json-iterator/go"
	"golang.org/x/net/context"
)

// AzureDataExplorer stores reference to plugin and logger
type AzureDataExplorer struct {
	backend.CallResourceHandler
	client   client.AdxClient
	settings *models.DatasourceSettings
}

var tokenCache = tokenprovider.NewConcurrentTokenCache()

const AdxScope = "https://kusto.kusto.windows.net/.default"

func NewDatasource(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	adx := &AzureDataExplorer{}
	datasourceSettings := &models.DatasourceSettings{}
	err := datasourceSettings.Load(settings)
	if err != nil {
		return nil, err
	}
	adx.settings = datasourceSettings

	tokenProvider := tokenprovider.NewAccessTokenProvider(tokenCache, datasourceSettings.ClientID, datasourceSettings.TenantID, datasourceSettings.AzureCloud, datasourceSettings.Secret, []string{"https://kusto.kusto.windows.net/.default"})

	httpClientProvider := sdkhttpclient.NewProvider(sdkhttpclient.ProviderOptions{
		Middlewares: []sdkhttpclient.Middleware{
			client.AuthMiddleware(tokenProvider),
		},
	})

	httpClientOptions, err := settings.HTTPClientOptions()
	if err != nil {
		backend.Logger.Error("failed to create HTTP client options", "error", err.Error())
		return nil, err
	}

	httpClient, err := httpClientProvider.New(httpClientOptions)
	if err != nil {
		backend.Logger.Error("failed to create HTTP client", "error", err.Error())
		return nil, err
	}
	adx.client = client.New(httpClient)

	mux := http.NewServeMux()
	adx.registerRoutes(mux)
	adx.CallResourceHandler = httpadapter.New(mux)

	return adx, nil
}

func (adx *AzureDataExplorer) Dispose() {
	tokenCache.Purge()
}

// QueryData is the primary method called by grafana-server
func (adx *AzureDataExplorer) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	backend.Logger.Debug("Query", "datasource", req.PluginContext.DataSourceInstanceSettings.Name)
	res := backend.NewQueryDataResponse()

	for _, q := range req.Queries {
		res.Responses[q.RefID] = adx.handleQuery(q, req.PluginContext.User)
	}

	return res, nil
}

// CheckHealth handles health checks
func (adx *AzureDataExplorer) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	err := adx.client.TestRequest(adx.settings, models.NewConnectionProperties(adx.settings, nil))
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: err.Error(),
		}, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Success",
	}, nil
}

func (adx *AzureDataExplorer) handleQuery(q backend.DataQuery, user *backend.User) backend.DataResponse {
	resp := backend.DataResponse{}
	qm := &models.QueryModel{}

	err := jsoniter.Unmarshal(q.JSON, qm)
	if err != nil {
		resp.Error = err
		return resp
	}

	cs := models.NewCacheSettings(adx.settings, &q, qm)
	qm.MacroData = models.NewMacroData(cs.TimeRange, q.Interval.Milliseconds())

	if err := qm.Interpolate(); err != nil {
		resp.Error = err
		return resp
	}

	interpolatedQuery := qm.Query

	appendFrame := func(f *data.Frame) {
		resp.Frames = append(resp.Frames, f)
	}

	errorWithFrame := func(err error) {
		fm := &data.FrameMeta{ExecutedQueryString: interpolatedQuery}
		appendFrame(&data.Frame{RefID: q.RefID, Meta: fm})
		resp.Error = err
	}

	headers := map[string]string{}
	msClientRequestIDHeader := fmt.Sprintf("KGC.%s;%s", qm.QuerySource, uuid.Must(uuid.NewRandom()).String())
	if adx.settings.EnableUserTracking {
		if user != nil {
			msClientRequestIDHeader += fmt.Sprintf(";%v", user.Login)
			headers["x-ms-user-id"] = user.Login
		}
	}
	headers["x-ms-client-request-id"] = msClientRequestIDHeader

	var tableRes *models.TableResponse
	tableRes, err = adx.client.KustoRequest(adx.settings.ClusterURL+"/v1/rest/query", models.RequestPayload{
		CSL:         qm.Query,
		DB:          qm.Database,
		Properties:  models.NewConnectionProperties(adx.settings, cs),
		QuerySource: qm.QuerySource,
	}, headers)

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
			switch tsSchema.Type {
			case data.TimeSeriesTypeNot:
				f.AppendNotices(data.Notice{
					Severity: data.NoticeSeverityWarning,
					Text:     "Returned frame is not a time series, returning table format instead. The response must have at least one datetime field and one numeric field.",
				})
				appendFrame(f)
				continue
			case data.TimeSeriesTypeLong:
				wideFrame, err := data.LongToWide(f, nil)
				if err != nil {
					f.AppendNotices(data.Notice{
						Severity: data.NoticeSeverityWarning,
						Text:     fmt.Sprintf("detected long formatted time series but failed to convert from long frame: %v. Returning table format instead.", err),
					})
					appendFrame(f)
					continue
				}
				appendFrame(wideFrame)
			default:
				appendFrame(f)
			}
		}
	case "time_series_adx_series":
		orginalDFs, err := tableRes.ToDataFrames(interpolatedQuery)
		if err != nil {
			errorWithFrame(fmt.Errorf("error converting response to data frames: %w", err))
			return resp
		}
		for _, f := range orginalDFs {
			formatedDF, err := models.ToADXTimeSeries(f)
			if err != nil {
				errorWithFrame(err)
				return resp
			}
			appendFrame(formatedDF)
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
