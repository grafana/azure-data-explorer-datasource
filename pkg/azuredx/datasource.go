package azuredx

import (
	"fmt"
	"math/rand"
	"net/http"
	"strings"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/adxauth/adxcredentials"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/helpers"
	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/grafana/grafana-azure-sdk-go/v2/azusercontext"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/errorsource"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/client"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"

	// 100% compatible drop-in replacement of "encoding/json"
	json "github.com/json-iterator/go"
	"golang.org/x/net/context"
)

// AzureDataExplorer stores reference to plugin and logger
type AzureDataExplorer struct {
	backend.CallResourceHandler
	client   client.AdxClient
	settings *models.DatasourceSettings
}

func NewDatasource(ctx context.Context, instanceSettings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	adx := &AzureDataExplorer{}

	var jsonData map[string]interface{}
	err := json.Unmarshal(instanceSettings.JSONData, &jsonData)
	if err != nil {
		return nil, fmt.Errorf("unable to get jsonData from instanceSettings: %w", err)
	}

	datasourceSettings := &models.DatasourceSettings{}
	err = datasourceSettings.Load(instanceSettings)
	if err != nil {
		return nil, err
	}
	adx.settings = datasourceSettings
	adx.settings.OpenAIAPIKey = strings.TrimSpace(instanceSettings.DecryptedSecureJSONData["OpenAIAPIKey"])

	azureSettings, err := azsettings.ReadSettings(ctx)
	if err != nil {
		backend.Logger.Error("failed to read Azure settings from Grafana", "error", err.Error())
		return nil, err
	}

	credentials, err := adxcredentials.FromDatasourceData(jsonData, instanceSettings.DecryptedSecureJSONData)
	if err != nil {
		return nil, err
	} else if credentials == nil {
		credentials = adxcredentials.GetDefaultCredentials(azureSettings)
	}

	adxClient, err := client.New(ctx, &instanceSettings, datasourceSettings, azureSettings, credentials)
	if err != nil {
		backend.Logger.Error("failed to create ADX client", "error", err.Error())
		return nil, err
	}
	adx.client = adxClient

	mux := http.NewServeMux()
	adx.registerRoutes(mux)
	adx.CallResourceHandler = httpadapter.New(mux)

	return adx, nil
}

// QueryData is the primary method called by grafana-server
func (adx *AzureDataExplorer) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	ctx = azusercontext.WithUserFromQueryReq(ctx, req)
	backend.Logger.Debug("Query", "datasource", req.PluginContext.DataSourceInstanceSettings.Name)

	res := backend.NewQueryDataResponse()

	for _, q := range req.Queries {
		res.Responses[q.RefID] = adx.handleQuery(ctx, q, req.PluginContext.User)
	}

	return res, nil
}

func (adx *AzureDataExplorer) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	return adx.CallResourceHandler.CallResource(azusercontext.WithUserFromResourceReq(ctx, req), req, sender)
}

// CheckHealth handles health checks
func (adx *AzureDataExplorer) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	ctx = azusercontext.WithUserFromHealthCheckReq(ctx, req)
	headers := map[string]string{}

	err := adx.client.TestKustoRequest(ctx, adx.settings, models.NewConnectionProperties(adx.settings, nil), headers)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: err.Error(),
		}, nil
	}

	err = adx.client.TestARGsRequest(ctx, adx.settings, models.NewConnectionProperties(adx.settings, nil), headers)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusOk,
			Message: "Success connecting to Azure Data Explore, but unable to connect to Azure Resource Graph to get clusters: " + err.Error(),
		}, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Success",
	}, nil
}

func (adx *AzureDataExplorer) handleQuery(ctx context.Context, q backend.DataQuery, user *backend.User) backend.DataResponse {
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

	resp, err := adx.modelQuery(ctx, qm, props, user)
	if err != nil {
		resp.Frames = append(resp.Frames, &data.Frame{
			RefID: q.RefID,
			Meta:  &data.FrameMeta{ExecutedQueryString: qm.Query},
		})
		resp.Error = err
		errWithSource, ok := err.(errorsource.Error)
		if ok {
			resp.ErrorSource = errWithSource.ErrorSource()
		}
	}
	return resp
}

func (adx *AzureDataExplorer) modelQuery(ctx context.Context, q models.QueryModel, props *models.Properties, user *backend.User) (backend.DataResponse, error) {
	headers := map[string]string{}
	msClientRequestIDHeader := fmt.Sprintf("KGC.%s;%x", q.QuerySource, rand.Uint64())
	if adx.settings.EnableUserTracking {
		if user != nil {
			msClientRequestIDHeader += fmt.Sprintf(";%v", user.Login)
			headers["x-ms-user-id"] = user.Login
		}
	}
	headers["x-ms-client-request-id"] = msClientRequestIDHeader

	clusterURL := q.ClusterUri
	if clusterURL == "" {
		clusterURL = adx.settings.ClusterURL
	}

	database := q.Database
	if database == "" {
		if adx.settings.DefaultDatabase == "" {
			return backend.DataResponse{}, errorsource.DownstreamError(fmt.Errorf("query submitted without database specified and data source does not have a default database"), false)
		}
		database = adx.settings.DefaultDatabase
	}

	sanitized, err := helpers.SanitizeClusterUri(clusterURL)
	if err != nil {
		// errorsource set in SanitizeClusterUri
		return backend.DataResponse{}, err
	}
	application := adx.settings.Application
	tableRes, err := adx.client.KustoRequest(ctx, sanitized, "/v1/rest/query", models.RequestPayload{
		CSL:         q.Query,
		DB:          database,
		Properties:  props,
		QuerySource: q.QuerySource,
	}, adx.settings.EnableUserTracking, application)
	if err != nil {
		backend.Logger.Debug("error building kusto request", "error", err.Error())
		// errorsource set in KustoRequest
		return backend.DataResponse{}, err
	}

	var resp backend.DataResponse
	switch q.Format {
	case "table":
		resp.Frames, err = tableRes.ToDataFrames(q.Query, q.Format)
		if err != nil {
			backend.Logger.Debug("error converting response to data frames", "error", err.Error())
			return resp, fmt.Errorf("error converting response to data frames: %w", err)
		}
	case "trace":
		resp.Frames, err = tableRes.ToDataFrames(q.Query, q.Format)
		if err != nil {
			backend.Logger.Debug("error converting response to data frames", "error", err.Error())
			return resp, fmt.Errorf("error converting response to data frames: %w", err)
		}
	case "time_series":
		frames, err := tableRes.ToDataFrames(q.Query, q.Format)
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
		originalDFs, err := tableRes.ToDataFrames(q.Query, q.Format)
		if err != nil {
			return resp, fmt.Errorf("error converting response to data frames: %w", err)
		}
		for _, f := range originalDFs {
			formattedDF, err := models.ToADXTimeSeries(f)
			if err != nil {
				return resp, errorsource.DownstreamError(err, false)
			}
			resp.Frames = append(resp.Frames, formattedDF)
		}
	case "logs":
		resp.Frames, err = tableRes.ToDataFrames(q.Query, q.Format)
		if err != nil {
			backend.Logger.Debug("error converting response to data frames", "error", err.Error())
			return resp, fmt.Errorf("error converting response to data frames: %w", err)
		}
	default:
		resp.Error = fmt.Errorf("unsupported query type: '%v'", q.Format)
	}

	return resp, nil
}
