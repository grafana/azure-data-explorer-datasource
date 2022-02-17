package azuredx

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/stretchr/testify/require"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/azureauth"
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
		mux.ServeHTTP(res, httptest.NewRequest("POST", "/databases", nil))
		require.Equal(t, http.StatusMethodNotAllowed, res.Code)

		mux.ServeHTTP(res, httptest.NewRequest("PUT", "/schema", nil))
		require.Equal(t, http.StatusMethodNotAllowed, res.Code)
	})

	t.Run("When kust request fails route should return an error", func(t *testing.T) {
		setup()
		adx.client = &failingClient{}
		adx.settings = &models.DatasourceSettings{
			ClusterURL: "some-baseurl",
			TenantID:   "9a2ddabe-90c0-4e09-bf28-a91111a56ed7",
		}
		var err error
		adx.serviceCredentials, err = azureauth.NewServiceCredentials(adx.settings, http.DefaultClient)
		require.Nil(t, err)
		adx.serviceCredentials.ServicePrincipalToken = func(ctx context.Context, opts azcore.TokenRequestOptions) (*azcore.AccessToken, error) {
			return &azcore.AccessToken{Token: "test-token"}, nil
		}
		mux.ServeHTTP(res, httptest.NewRequest("GET", "/databases", nil))
		require.Equal(t, http.StatusInternalServerError, res.Code)
		httpError := models.HttpError{}
		err = json.NewDecoder(res.Body).Decode(&httpError)
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
			TenantID:   "9a2ddabe-90c0-4e09-bf28-a91111a56ed7",
		}
		var err error
		adx.serviceCredentials, err = azureauth.NewServiceCredentials(adx.settings, http.DefaultClient)
		require.Nil(t, err)
		adx.serviceCredentials.ServicePrincipalToken = func(ctx context.Context, opts azcore.TokenRequestOptions) (*azcore.AccessToken, error) {
			return &azcore.AccessToken{Token: "test-token"}, nil
		}
		mux.ServeHTTP(res, httptest.NewRequest("GET", "/databases", nil))
		require.Equal(t, http.StatusOK, res.Code)
		tableResponse := models.TableResponse{}
		err = json.NewDecoder(res.Body).Decode(&tableResponse)
		require.Nil(t, err)
		require.Len(t, tableResponse.Tables, 1)
		require.Len(t, tableResponse.Tables[0].Columns, 2)
		require.Len(t, tableResponse.Tables[0].Rows, 2)
	})
}

type failingClient struct{}

func (c *failingClient) TestRequest(datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error {
	panic("not implemented")
}

func (c *failingClient) KustoRequest(url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error) {
	return nil, fmt.Errorf("HTTP error: %v - %v", http.StatusBadRequest, "")
}

type workingClient struct{}

func (c *workingClient) TestRequest(datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error {
	panic("not implemented")
}

func (c *workingClient) KustoRequest(url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error) {
	return &models.TableResponse{
		Tables: []models.Table{
			{
				TableName: "table1",
				Columns: []models.Column{
					{ColumnName: "col1"},
					{ColumnName: "col2"},
				},
				Rows: []models.Row{
					{
						"val1",
					},
					{
						"val2",
					},
				},
			},
		},
	}, nil
}
