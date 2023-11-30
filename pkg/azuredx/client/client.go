package client

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"

	"github.com/grafana/grafana-azure-sdk-go/azcredentials"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
	"github.com/grafana/grafana-plugin-sdk-go/backend"

	// 100% compatible drop-in replacement of "encoding/json"
	json "github.com/json-iterator/go"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
)

type AdxClient interface {
	TestRequest(ctx context.Context, datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error
	KustoRequest(ctx context.Context, cluster string, url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error)
	ARGClusterRequest(ctx context.Context, payload models.ARGRequestPayload, additionalHeaders map[string]string) ([]models.ClusterOption, error)
}

var _ AdxClient = new(Client) // validates interface conformance

// Client is an http.Client used for API requests.
type Client struct {
	httpClientAzureCloud *http.Client
	httpClientManagement *http.Client
}

// NewClient creates a Grafana Plugin SDK Go Http Client
func New(instanceSettings *backend.DataSourceInstanceSettings, dsSettings *models.DatasourceSettings, azureSettings *azsettings.AzureSettings, credentials azcredentials.AzureCredentials) (*Client, error) {
	httpClientAzureCloud, err := newHttpClientAzureCloud(instanceSettings, dsSettings, azureSettings, credentials)
	if err != nil {
		return nil, err
	}
	httpClientManagement, err := newHttpClientManagement(instanceSettings, dsSettings, azureSettings, credentials)
	if err != nil {
		return nil, err
	}
	return &Client{httpClientAzureCloud: httpClientAzureCloud, httpClientManagement: httpClientManagement}, nil
}

// TestRequest handles a data source test request in Grafana's Datasource configuration UI.
func (c *Client) TestRequest(ctx context.Context, datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error {
	buf, err := json.Marshal(models.RequestPayload{
		CSL:        ".show databases schema",
		DB:         datasourceSettings.DefaultDatabase,
		Properties: properties,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", datasourceSettings.ClusterURL+"/v1/rest/query", bytes.NewReader(buf))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	for key, value := range additionalHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClientAzureCloud.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("azure HTTP %q", resp.Status)
	}
	return nil
}

// KustoRequest executes a Kusto Query language request to Azure's Data Explorer V1 REST API
// and returns a TableResponse. If there is a query syntax error, the error message inside
// the API's JSON error response is returned as well (if available).
func (c *Client) KustoRequest(ctx context.Context, cluster string, url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error) {
	buf, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("no Azure request serial: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cluster+url, bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("no Azure request instance: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-ms-app", "Grafana-ADX")
	if payload.QuerySource == "" {
		payload.QuerySource = "unspecified"
	}
	for key, value := range additionalHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClientAzureCloud.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		// HTTP 401 has no error body
		return nil, fmt.Errorf("azure HTTP %q", resp.Status)

	case resp.StatusCode/100 != 2:
		var r models.ErrorResponse
		err := json.NewDecoder(resp.Body).Decode(&r)
		if err != nil {
			return nil, fmt.Errorf("azure HTTP %q with malformed error response: %s", resp.Status, err)
		}
		return nil, fmt.Errorf("azure HTTP %q: %q", resp.Status, r.Error.Message)
	}

	return models.TableFromJSON(resp.Body)
}

func (c *Client) ARGClusterRequest(ctx context.Context, payload models.ARGRequestPayload, additionalHeaders map[string]string) ([]models.ClusterOption, error) {
	buf, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("no Azure request serial: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01", bytes.NewReader(buf))
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
		return nil, err
	}

	defer resp.Body.Close()
	if err != nil {
		return nil, err
	}

	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		// HTTP 401 has no error body
		return nil, fmt.Errorf("azure HTTP %q", resp.Status)

	case resp.StatusCode/100 != 2:
		var r models.ErrorResponse
		err := json.NewDecoder(resp.Body).Decode(&r)
		if err != nil {
			return nil, fmt.Errorf("azure HTTP %q with malformed error response: %s", resp.Status, err)
		}
		return nil, fmt.Errorf("azure HTTP %q: %q", resp.Status, r.Error.Message)
	}
	var clusterData struct {
		Data []struct {
			Name       string `json:"name,omitempty"`
			Properties struct {
				Uri string `json:"uri,omitempty"`
			} `json:"properties,omitempty"`
		} `json:"data,omitempty"`
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	json.NewDecoder(bytes.NewReader(body)).Decode(&clusterData)

	clusterOptions := []models.ClusterOption{}
	for _, v := range clusterData.Data {
		clusterOptions = append(clusterOptions, models.ClusterOption{
			Name: v.Name,
			Uri:  v.Properties.Uri,
		})
	}
	return clusterOptions, nil
}
