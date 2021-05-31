package client

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"

	jsoniter "github.com/json-iterator/go"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type AdxClient interface {
	TestRequest(datasourceSettings *models.DatasourceSettings, properties *models.Properties) error
	KustoRequest(url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, int, string, error)
}

// Client is an http.Client used for API requests.
type Client struct {
	httpClient *http.Client
}

// NewClient creates a Grafana Plugin SDK Go Http Client
func New(client *http.Client) *Client {
	return &Client{httpClient: client}
}

// TestRequest handles a data source test request in Grafana's Datasource configuration UI.
func (c *Client) TestRequest(datasourceSettings *models.DatasourceSettings, properties *models.Properties) error {
	var buf bytes.Buffer
	err := jsoniter.NewEncoder(&buf).Encode(models.RequestPayload{
		CSL:        ".show databases schema",
		DB:         datasourceSettings.DefaultDatabase,
		Properties: properties,
	})
	if err != nil {
		return err
	}
	resp, err := c.httpClient.Post(datasourceSettings.ClusterURL+"/v1/rest/query", "application/json", &buf)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode > 299 {
		return fmt.Errorf("HTTP error: %v", resp.Status)
	}
	return nil
}

// KustoRequest executes a Kusto Query language request to Azure's Data Explorer V1 REST API
// and returns a TableResponse. If there is a query syntax error, the error message inside
// the API's JSON error response is returned as well (if available).
func (c *Client) KustoRequest(url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, int, string, error) {
	var buf bytes.Buffer
	err := jsoniter.NewEncoder(&buf).Encode(payload)
	if err != nil {
		return nil, http.StatusInternalServerError, "", err
	}
	req, err := http.NewRequest(http.MethodPost, url, &buf)
	if err != nil {
		return nil, http.StatusInternalServerError, "", err
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

	resp, err := c.httpClient.Do(req)
	statusCode := resp.StatusCode
	if err != nil {
		return nil, statusCode, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode > 299 {
		bodyBytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return nil, http.StatusInternalServerError, "", err
		}
		bodyString := string(bodyBytes)
		if resp.StatusCode == 401 { // 401 does not have a JSON body
			return nil, statusCode, "", fmt.Errorf("HTTP error: %v - %v", resp.Status, bodyString)
		}
		errorData := &models.ErrorResponse{}
		err = jsoniter.Unmarshal(bodyBytes, errorData)
		if err != nil {
			backend.Logger.Debug("failed to unmarshal error body from response", "error", err)
			statusCode = http.StatusInternalServerError
		}
		return nil, statusCode, errorData.Error.Message, fmt.Errorf("HTTP error: %v - %v", resp.Status, bodyString)
	}
	tr, err := models.TableFromJSON(resp.Body)
	return tr, statusCode, "", err
}
