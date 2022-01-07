package azuredx

import (
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/azureauth"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/client"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/tokenprovider"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	sdkhttpclient "github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/grafana/grafana-plugin-sdk-go/data"

	// 100% compatible drop-in replacement of "encoding/json"
	json "github.com/json-iterator/go"
	"golang.org/x/net/context"
)

// AzureDataExplorer stores reference to plugin and logger
type AzureDataExplorer struct {
	backend.CallResourceHandler
	client             client.AdxClient
	settings           *models.DatasourceSettings
	serviceCredentials azureauth.ServiceCredentials
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

	httpClientOptions, err := settings.HTTPClientOptions()
	if err != nil {
		backend.Logger.Error("failed to create HTTP client options", "error", err.Error())
		return nil, err
	}
	httpClientOptions.Timeouts.Timeout = datasourceSettings.QueryTimeout
	httpClient, err := sdkhttpclient.NewProvider(sdkhttpclient.ProviderOptions{}).New(httpClientOptions)
	if err != nil {
		backend.Logger.Error("failed to create HTTP client", "error", err.Error())
		return nil, err
	}
	adx.client = client.New(httpClient)

	adx.serviceCredentials = azureauth.ServiceCredentials{
		DatasourceSettings:    *datasourceSettings,
		PostForm:              httpClient.PostForm,
		ServicePrincipalToken: tokenprovider.NewAccessTokenProvider(tokenCache, datasourceSettings.ClientID, datasourceSettings.TenantID, datasourceSettings.AzureCloud, datasourceSettings.Secret, []string{"https://kusto.kusto.windows.net/.default"}).GetAccessToken,
	}

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

	authorization, err := adx.serviceCredentials.QueryDataAuthorization(req)
	if err != nil {
		return nil, err
	}

	for _, q := range req.Queries {
		res.Responses[q.RefID] = adx.handleQuery(q, req.PluginContext.User, authorization)
	}

	return res, nil
}

// CheckHealth handles health checks
func (adx *AzureDataExplorer) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	authorization, err := adx.serviceCredentials.ServicePrincipalAuthorization(ctx)
	if err != nil {
		return nil, err
	}
	headers := map[string]string{"Authorization": authorization}
	err = adx.client.TestRequest(adx.settings, models.NewConnectionProperties(adx.settings, nil), headers)
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

func (adx *AzureDataExplorer) handleQuery(q backend.DataQuery, user *backend.User, authorization string) backend.DataResponse {
	var qm models.QueryModel
	err := json.Unmarshal(q.JSON, &qm)
	if err != nil {
		return backend.DataResponse{Error: fmt.Errorf("malformed request query: %w", err)}
	}

	cs := models.NewCacheSettings(adx.settings, &q, &qm)
	qm.MacroData = models.NewMacroData(cs.TimeRange, q.Interval.Milliseconds())
	if err := qm.Interpolate(); err != nil {
		return backend.DataResponse{Error: err}
	}
	props := models.NewConnectionProperties(adx.settings, cs)

	resp, err := adx.modelQuery(qm, props, user, authorization)
	if err != nil {
		resp.Frames = append(resp.Frames, &data.Frame{
			RefID: q.RefID,
			Meta:  &data.FrameMeta{ExecutedQueryString: qm.Query},
		})
		resp.Error = err
	}
	return resp
}

func (adx *AzureDataExplorer) modelQuery(q models.QueryModel, props *models.Properties, user *backend.User, authorization string) (backend.DataResponse, error) {
	headers := map[string]string{"Authorization": authorization}
	msClientRequestIDHeader := fmt.Sprintf("KGC.%s;%s", q.QuerySource, uuid.Must(uuid.NewRandom()).String())
	if adx.settings.EnableUserTracking {
		if user != nil {
			msClientRequestIDHeader += fmt.Sprintf(";%v", user.Login)
			headers["x-ms-user-id"] = user.Login
		}
	}
	headers["x-ms-client-request-id"] = msClientRequestIDHeader

	tableRes, err := adx.client.KustoRequest(adx.settings.ClusterURL+"/v1/rest/query", models.RequestPayload{
		CSL:         q.Query,
		DB:          q.Database,
		Properties:  props,
		QuerySource: q.QuerySource,
	}, headers)
	if err != nil {
		backend.Logger.Debug("error building kusto request", "error", err.Error())
		return backend.DataResponse{}, err
	}

	var resp backend.DataResponse
	switch q.Format {
	case "table":
		resp.Frames, err = tableRes.ToDataFrames(q.Query)
		if err != nil {
			backend.Logger.Debug("error converting response to data frames", "error", err.Error())
			return resp, fmt.Errorf("error converting response to data frames: %w", err)
		}
	case "time_series":
		frames, err := tableRes.ToDataFrames(q.Query)
		if err != nil {
			return resp, err
		}
		for _, f := range frames {
			tsSchema := f.TimeSeriesSchema()
			switch tsSchema.Type {
			case data.TimeSeriesTypeNot:
				f.AppendNotices(data.Notice{
					Severity: data.NoticeSeverityWarning,
					Text:     "Returned frame is not a time series, returning table format instead. The response must have at least one datetime field and one numeric field.",
				})
				resp.Frames = append(resp.Frames, f)
				continue
			case data.TimeSeriesTypeLong:
				wideFrame, err := data.LongToWide(f, nil)
				if err != nil {
					f.AppendNotices(data.Notice{
						Severity: data.NoticeSeverityWarning,
						Text:     fmt.Sprintf("detected long formatted time series but failed to convert from long frame: %v. Returning table format instead.", err),
					})
					resp.Frames = append(resp.Frames, f)
					continue
				}
				resp.Frames = append(resp.Frames, wideFrame)
			default:
				resp.Frames = append(resp.Frames, f)
			}
		}
	case "time_series_adx_series":
		orginalDFs, err := tableRes.ToDataFrames(q.Query)
		if err != nil {
			return resp, fmt.Errorf("error converting response to data frames: %w", err)
		}
		for _, f := range orginalDFs {
			formatedDF, err := models.ToADXTimeSeries(f)
			if err != nil {
				return resp, err
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
		resp.Error = fmt.Errorf("unsupported query type: '%v'", q.Format)
	}

	return resp, nil
}
