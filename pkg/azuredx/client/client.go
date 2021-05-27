package client

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/google/uuid"
	jsoniter "github.com/json-iterator/go"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// Client is an http.Client used for API requests.
type Client struct {
	*http.Client
}

// NewClient creates a Grafana Plugin SDK Go Http Client
func New(client *http.Client) *Client {
	return &Client{Client: client}
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
	resp, err := c.Post(datasourceSettings.ClusterURL+"/v1/rest/query", "application/json", &buf)
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
func (c *Client) KustoRequest(datasourceSettings *models.DatasourceSettings, payload models.RequestPayload, querySource string, user *backend.User) (*models.TableResponse, string, error) {
	var buf bytes.Buffer
	err := jsoniter.NewEncoder(&buf).Encode(payload)
	if err != nil {
		return nil, "", err
	}
	req, err := http.NewRequest(http.MethodPost, datasourceSettings.ClusterURL+"/v1/rest/query", &buf)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-ms-app", "Grafana-ADX")
	if querySource == "" {
		querySource = "unspecified"
	}

	msClientRequestIDHeader := fmt.Sprintf("KGC.%v;%v", querySource, uuid.Must(uuid.NewRandom()).String())
	if datasourceSettings.EnableUserTracking {
		if user != nil {
			msClientRequestIDHeader += fmt.Sprintf(";%v", user.Login)
			req.Header.Set("x-ms-user-id", user.Login)
		}
	}
	req.Header.Set("x-ms-client-request-id", msClientRequestIDHeader)

	resp, err := c.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode > 299 {
		bodyBytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return nil, "", err
		}
		bodyString := string(bodyBytes)
		if resp.StatusCode == 401 { // 401 does not have a JSON body
			return nil, "", fmt.Errorf("HTTP error: %v - %v", resp.Status, bodyString)
		}
		errorData := &models.ErrorResponse{}
		err = jsoniter.Unmarshal(bodyBytes, errorData)
		if err != nil {
			backend.Logger.Debug("failed to unmarshal error body from response", "error", err)
		}
		return nil, errorData.Error.Message, fmt.Errorf("HTTP error: %v - %v", resp.Status, bodyString)
	}
	tr, err := models.TableFromJSON(resp.Body)
	return tr, "", err
}
