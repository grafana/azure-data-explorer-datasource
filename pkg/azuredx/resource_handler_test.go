package azuredx

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
)

func TestResourceHandler(t *testing.T) {
	var res *httptest.ResponseRecorder
	var adx AzureDataExplorer
	var mux *http.ServeMux

	setup := func() {
		res = httptest.NewRecorder()
		adx = AzureDataExplorer{}
		mux = http.NewServeMux()
		adx.registerRoutes(mux)
	}

	t.Run("When incorrect method is used a 405 should be returned", func(t *testing.T) {
		setup()

		mux.ServeHTTP(res, httptest.NewRequest("PUT", "/databases", nil))
		require.Equal(t, http.StatusMethodNotAllowed, res.Code)

		mux.ServeHTTP(res, httptest.NewRequest("PUT", "/schema", nil))
		require.Equal(t, http.StatusMethodNotAllowed, res.Code)

		mux.ServeHTTP(res, httptest.NewRequest("PUT", "/generateQuery", nil))
		require.Equal(t, http.StatusMethodNotAllowed, res.Code)
	})

	t.Run("When kust request fails route should return an error", func(t *testing.T) {
		setup()
		adx.client = &failingClient{}
		adx.settings = &models.DatasourceSettings{
			ClusterURL: "some-baseurl",
		}
		mux.ServeHTTP(res, httptest.NewRequest("POST", "/databases", strings.NewReader("{}")))
		require.Equal(t, http.StatusInternalServerError, res.Code)
		httpError := models.HttpError{}
		err := json.NewDecoder(res.Body).Decode(&httpError)
		require.Nil(t, err)
		require.Equal(t, http.StatusInternalServerError, httpError.StatusCode)
		require.Contains(t, httpError.Error, fmt.Sprintf("HTTP error: %v", http.StatusBadRequest))
		require.Equal(t, httpError.Message, fmt.Sprintf("Azure query unsuccessful: %s", httpError.Error))
	})

	t.Run("When kust request was successful route should return a json table", func(t *testing.T) {
		setup()
		adx.client = &workingClient{}
		adx.settings = &models.DatasourceSettings{
			ClusterURL: "some-baseurl",
		}
		mux.ServeHTTP(res, httptest.NewRequest("POST", "/databases", strings.NewReader("{}")))
		require.Equal(t, http.StatusOK, res.Code)
		tableResponse := models.TableResponse{}
		err := json.NewDecoder(res.Body).Decode(&tableResponse)
		require.Nil(t, err)
		require.Len(t, tableResponse.Tables, 1)
		require.Len(t, tableResponse.Tables[0].Columns, 2)
		require.Len(t, tableResponse.Tables[0].Rows, 2)
	})
}

type failingClient struct{}

func (c *failingClient) TestKustoRequest(_ context.Context, _ *models.DatasourceSettings, _ *models.Properties, _ map[string]string) error {
	panic("not implemented")
}

func (c *failingClient) TestARGsRequest(_ context.Context, _ *models.DatasourceSettings, _ *models.Properties, _ map[string]string) error {
	panic("not implemented")
}

func (c *failingClient) KustoRequest(_ context.Context, _ string, _ string, _ models.RequestPayload, _ bool, _ string) (*models.TableResponse, error) {
	return nil, fmt.Errorf("HTTP error: %v - %v", http.StatusBadRequest, "")
}

func (c *failingClient) ARGClusterRequest(_ context.Context, payload models.ARGRequestPayload, additionalHeaders map[string]string) ([]models.ClusterOption, error) {
	panic("not implemented")
}

type workingClient struct{}

func (c *workingClient) TestKustoRequest(_ context.Context, _ *models.DatasourceSettings, _ *models.Properties, _ map[string]string) error {
	panic("not implemented")
}

func (c *workingClient) TestARGsRequest(_ context.Context, _ *models.DatasourceSettings, _ *models.Properties, _ map[string]string) error {
	panic("not implemented")
}

func (c *workingClient) KustoRequest(_ context.Context, _ string, _ string, _ models.RequestPayload, _ bool, _ string) (*models.TableResponse, error) {
	return &models.TableResponse{
		Tables: []models.Table{
			{
				TableName: "table1",
				Columns: []models.Column{
					{ColumnName: "col1"},
					{ColumnName: "col2"},
				},
				Rows: []models.Row{
					"val1",
					"val2",
				},
			},
		},
	}, nil
}

func (c *workingClient) ARGClusterRequest(_ context.Context, payload models.ARGRequestPayload, additionalHeaders map[string]string) ([]models.ClusterOption, error) {
	panic("not implemented")
}

type redirectTransport struct {
	target *url.URL
	next   http.RoundTripper
}

func (t redirectTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req = req.Clone(req.Context())
	req.URL.Scheme = t.target.Scheme
	req.URL.Host = t.target.Host
	return t.next.RoundTrip(req)
}

func TestGenerateQuery(t *testing.T) {
	var sent openaiBody
	server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		require.NoError(t, json.NewDecoder(req.Body).Decode(&sent))
		_, err := rw.Write([]byte(`{"choices":[{"message":{"content":"StormEvents | take 10"}}]}`))
		require.NoError(t, err)
	}))
	defer server.Close()

	target, err := url.Parse(server.URL)
	require.NoError(t, err)
	original := http.DefaultTransport
	http.DefaultTransport = redirectTransport{target: target, next: original}
	defer func() { http.DefaultTransport = original }()

	adx := AzureDataExplorer{settings: &models.DatasourceSettings{OpenAIAPIKey: "test-key"}}
	res := httptest.NewRecorder()
	adx.generateQuery(res, httptest.NewRequest(http.MethodPost, "/generateQuery", strings.NewReader("show ten storms")))

	require.Equal(t, http.StatusOK, res.Code, res.Body.String())
	require.Contains(t, res.Body.String(), "StormEvents | take 10")
	require.Equal(t, "gpt-5.6-terra", sent.Model)
}
