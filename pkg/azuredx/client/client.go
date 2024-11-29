package client

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"

	"github.com/grafana/grafana-azure-sdk-go/v2/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/grafana/grafana-azure-sdk-go/v2/azusercontext"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/errorsource"

	// 100% compatible drop-in replacement of "encoding/json"
	json "github.com/json-iterator/go"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/helpers"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
)

type AdxClient interface {
	TestKustoRequest(ctx context.Context, datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error
	TestARGsRequest(ctx context.Context, datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error
	KustoRequest(ctx context.Context, cluster string, url string, payload models.RequestPayload, userTrackingEnabled bool, application string) (*models.TableResponse, error)
	ARGClusterRequest(ctx context.Context, payload models.ARGRequestPayload, additionalHeaders map[string]string) ([]models.ClusterOption, error)
}

var _ AdxClient = new(Client) // validates interface conformance

// Client is an http.Client used for API requests.
type Client struct {
	httpClientKusto      *http.Client
	httpClientManagement *http.Client
	cloudSettings        *azsettings.AzureCloudSettings
}

// NewClient creates a Grafana Plugin SDK Go Http Client
func New(ctx context.Context, instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings, azureSettings *azsettings.AzureSettings, credentials azcredentials.AzureCredentials) (*Client, error) {
	// Extract cloud from credentials
	azureCloud, err := azcredentials.GetAzureCloud(azureSettings, credentials)
	if err != nil {
		return nil, err
	}

	cloudSettings, err := azureSettings.GetCloud(azureCloud)
	if err != nil {
		return nil, err
	}

	httpClientAzureCloud, err := newHttpClientAzureCloud(ctx, instanceSettings, dsSettings, azureSettings, credentials)
	if err != nil {
		return nil, err
	}
	httpClientManagement, err := newHttpClientManagement(ctx, instanceSettings, dsSettings, azureSettings, credentials)
	if err != nil {
		return nil, err
	}
	return &Client{httpClientKusto: httpClientAzureCloud, httpClientManagement: httpClientManagement, cloudSettings: cloudSettings}, nil
}

func (c *Client) TestARGsRequest(ctx context.Context, datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error {
	if err := c.testManagementClient(ctx, datasourceSettings, additionalHeaders); err != nil {
		return err
	}
	return nil
}

// TestKustoRequest handles a data source test request in Grafana's Datasource configuration UI.
func (c *Client) TestKustoRequest(ctx context.Context, datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error {
	clusterURL := datasourceSettings.ClusterURL
	if clusterURL == "" {

		payload := models.ARGRequestPayload{Query: "resources | where type == \"microsoft.kusto/clusters\""}

		headers := map[string]string{}

		clusters, err := c.ARGClusterRequest(ctx, payload, headers)
		if err != nil {
			return fmt.Errorf("Unable to connect to Azure Resource Graph. Add access to ARG in Azure or add a default cluster URL. %w", err)
		}
		if len(clusters) == 0 {
			return errors.New("Azure Resource Graph resource query returned 0 clusters.")
		}
		clusterURL = clusters[0].Uri
	}

	sanitized, err := helpers.SanitizeClusterUri(clusterURL)
	if err != nil {
		return fmt.Errorf("invalid clusterUri: %w", err)
	}

	if err := c.testKustoClient(ctx, datasourceSettings, sanitized, properties, additionalHeaders); err != nil {
		return err
	}

	return nil
}

func (c *Client) testKustoClient(ctx context.Context, datasourceSettings *models.DatasourceSettings, clusterURL string, properties *models.Properties, additionalHeaders map[string]string) error {
	buf, err := json.Marshal(models.RequestPayload{
		CSL:        ".show databases schema",
		DB:         datasourceSettings.DefaultDatabase,
		Properties: properties,
	})
	if err != nil {
		return err
	}

	fullUrl, err := url.JoinPath(clusterURL, "/v1/rest/query")
	if err != nil {
		return fmt.Errorf("invalid Azure request URL: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", fullUrl, bytes.NewReader(buf))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	for key, value := range additionalHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClientKusto.Do(req)
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode == 403 {
		return fmt.Errorf("The client does not have permission to get schemas on %q. The query editor will have limited options.", clusterURL)
	}
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("azure HTTP %q", resp.Status)
	}

	return nil
}

func (c *Client) testManagementClient(ctx context.Context, _ *models.DatasourceSettings, additionalHeaders map[string]string) error {
	buf, err := json.Marshal(models.ARGRequestPayload{Query: "resources | where type == \"microsoft.kusto/clusters\""})
	if err != nil {
		return fmt.Errorf("no Azure request serial: %w", err)
	}

	resourceManager, ok := c.cloudSettings.Properties["resourceManager"]
	if !ok {
		return fmt.Errorf("the Azure cloud '%s' doesn't have the required property for 'resourceManager'", c.cloudSettings.Name)
	}

	u, err := url.Parse(resourceManager)
	if err != nil {
		return fmt.Errorf("invalid Azure request URL: %w", err)
	}

	// the default path for Azure Resource Graph
	u = u.JoinPath("/providers/Microsoft.ResourceGraph/resources")

	params := u.Query()
	params.Add("api-version", "2021-03-01")
	u.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), bytes.NewReader(buf))
	if err != nil {
		return fmt.Errorf("no Azure request instance: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	for key, value := range additionalHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClientManagement.Do(req)
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode == 403 {
		return errors.New("The client does not have permission to use Azure Resource Graph. The cluster select in the query editor config will not be populated.")
	}
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("azure HTTP %q", resp.Status)
	}

	return nil
}

// KustoRequest executes a Kusto Query language request to Azure's Data Explorer V1 REST API
// and returns a TableResponse. If there is a query syntax error, the error message inside
// the API's JSON error response is returned as well (if available).
func (c *Client) KustoRequest(ctx context.Context, clusterUrl string, path string, payload models.RequestPayload, userTrackingEnabled bool, application string) (*models.TableResponse, error) {
	buf, err := json.Marshal(payload)
	if err != nil {
		return nil, errorsource.DownstreamError(fmt.Errorf("no Azure request serial: %w", err), false)
	}

	fullUrl, err := url.JoinPath(clusterUrl, path)
	if err != nil {
		return nil, errorsource.DownstreamError(fmt.Errorf("invalid Azure request URL: %w", err), false)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fullUrl, bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("no Azure request instance: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
    if application == "" {
        application = "Grafana-ADX"
    }
    req.Header.Set("x-ms-app", application)
	// req.Header.Set("x-ms-app", "Grafana-ADX")
	if payload.QuerySource == "" {
		payload.QuerySource = "unspecified"
	}

	msClientRequestIDHeader := fmt.Sprintf("KGC.%s;%x", payload.QuerySource, rand.Uint64())
	user, ok := azusercontext.GetCurrentUser(ctx)
	if userTrackingEnabled && ok {
		login := user.User.Login
		msClientRequestIDHeader += fmt.Sprintf(";%v", login)
		req.Header.Set("x-ms-user-id", login)
	}
	req.Header.Set("x-ms-client-request-id", msClientRequestIDHeader)

	resp, err := c.httpClientKusto.Do(req)
	if err != nil {
		return nil, errorsource.DownstreamError(err, false)
	}

	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		// HTTP 401 has no error body
		return nil, errorsource.DownstreamError(fmt.Errorf("azure HTTP %q", resp.Status), false)

	case resp.StatusCode/100 != 2:
		var r models.ErrorResponse
		err := json.NewDecoder(resp.Body).Decode(&r)
		if err != nil {
			return nil, errorsource.DownstreamError(fmt.Errorf("azure HTTP %q with malformed error response: %s", resp.Status, err), false)
		}
		return nil, errorsource.SourceError(backend.ErrorSourceFromHTTPStatus(resp.StatusCode), fmt.Errorf("azure HTTP %q: %q.\nReceived %q: %q", resp.Status, r.Error.Message, r.Error.Type, r.Error.Description), false)
	}

	return models.TableFromJSON(resp.Body)
}

func (c *Client) ARGClusterRequest(ctx context.Context, payload models.ARGRequestPayload, additionalHeaders map[string]string) ([]models.ClusterOption, error) {
	buf, err := json.Marshal(payload)
	if err != nil {
		return nil, errorsource.DownstreamError(fmt.Errorf("no Azure request serial: %w", err), false)
	}

	resourceManager, ok := c.cloudSettings.Properties["resourceManager"]
	if !ok {
		return nil, fmt.Errorf("the Azure cloud '%s' doesn't have the required property for 'resourceManager'", c.cloudSettings.Name)
	}

	u, err := url.Parse(resourceManager)
	if err != nil {
		return nil, errorsource.DownstreamError(fmt.Errorf("invalid Azure request URL: %w", err), false)
	}

	// the default path for Azure Resource Graph
	u = u.JoinPath("/providers/Microsoft.ResourceGraph/resources")

	params := u.Query()
	params.Add("api-version", "2021-03-01")
	u.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("no Azure request instance: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-ms-app", "Grafana-ADX")

	for key, value := range additionalHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClientManagement.Do(req)
	if err != nil {
		return nil, errorsource.DownstreamError(err, false)
	}

	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		// HTTP 401 has no error body
		return nil, errorsource.DownstreamError(fmt.Errorf("azure HTTP %q", resp.Status), false)

	case resp.StatusCode/100 != 2:
		var r models.ErrorResponse
		err := json.NewDecoder(resp.Body).Decode(&r)
		if err != nil {
			return nil, errorsource.DownstreamError(fmt.Errorf("azure HTTP %q with malformed error response: %s", resp.Status, err), false)
		}
		return nil, errorsource.SourceError(backend.ErrorSourceFromHTTPStatus(resp.StatusCode), fmt.Errorf("azure HTTP %q: %q", resp.Status, r.Error.Message), false)
	}
	var clusterData struct {
		Data []struct {
			Name       string `json:"name,omitempty"`
			Properties struct {
				Uri   string `json:"uri,omitempty"`
				State string `json:"state,omitempty"`
			} `json:"properties,omitempty"`
		} `json:"data,omitempty"`
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	err = json.NewDecoder(bytes.NewReader(body)).Decode(&clusterData)
	if err != nil {
		return nil, err
	}

	clusterOptions := []models.ClusterOption{}
	for _, v := range clusterData.Data {
		if v.Properties.State != "Running" {
			continue
		}
		clusterOptions = append(clusterOptions, models.ClusterOption{
			Name: v.Name,
			Uri:  v.Properties.Uri,
		})
	}
	return clusterOptions, nil
}
