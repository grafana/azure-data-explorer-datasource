package azuredx

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

var (
	kustoRequestMock      func(url string, cluster string, payload models.RequestPayload, enableUserTracking bool, application string) (*models.TableResponse, error)
	ARGClusterRequestMock func(payload models.ARGRequestPayload, additionalHeaders map[string]string) ([]models.ClusterOption, error)
	table                 = &models.TableResponse{
		Tables: []models.Table{
			{
				TableName: "Table_0",
				Columns:   []models.Column{},
				Rows:      []models.Row{},
			},
		},
	}
)

func TestDatasource(t *testing.T) {
	var adx AzureDataExplorer
	const UserLogin string = "user-login"
	const ClusterURL string = "base-url"
	const Application string = "Grafana-ADX"

	t.Run("When running a query the right args should be passed to KustoRequest", func(t *testing.T) {
		adx = AzureDataExplorer{}
		adx.client = &fakeClient{}
		adx.settings = &models.DatasourceSettings{EnableUserTracking: true, ClusterURL: ClusterURL, Application: Application}
		query := backend.DataQuery{
			RefID:         "",
			QueryType:     "",
			MaxDataPoints: 0,
			Interval:      0,
			TimeRange:     backend.TimeRange{},
			JSON:          []byte(`{"resultFormat": "table","querySource": "schema","database":"test-database"}`),
		}
		kustoRequestMock = func(url string, cluster string, payload models.RequestPayload, enableUserTracking bool, application string) (*models.TableResponse, error) {
			require.Equal(t, "/v1/rest/query", url)
			require.Equal(t, ClusterURL, cluster)
			require.Equal(t, payload.DB, "test-database")
			require.Equal(t, enableUserTracking, true)
			return table, nil
		}
		res := adx.handleQuery(context.Background(), query, &backend.User{Login: UserLogin})
		require.NoError(t, res.Error)
	})
	t.Run("When running a query the default database should be passed to KustoRequest if unspecified", func(t *testing.T) {
		adx = AzureDataExplorer{}
		adx.client = &fakeClient{}
		adx.settings = &models.DatasourceSettings{EnableUserTracking: true, ClusterURL: ClusterURL, DefaultDatabase: "test-default-database"}
		query := backend.DataQuery{
			RefID:         "",
			QueryType:     "",
			MaxDataPoints: 0,
			Interval:      0,
			TimeRange:     backend.TimeRange{},
			JSON:          []byte(`{"resultFormat": "table","querySource": "schema"}`),
		}
		kustoRequestMock = func(_ string, _ string, payload models.RequestPayload, _ bool, _ string) (*models.TableResponse, error) {
			require.Equal(t, payload.DB, "test-default-database")
			return table, nil
		}
		res := adx.handleQuery(context.Background(), query, &backend.User{Login: UserLogin})
		require.NoError(t, res.Error)
	})

	t.Run("Returns an error if query does not specify a database and none is available in the data source", func(t *testing.T) {
		adx = AzureDataExplorer{}
		adx.client = &fakeClient{}
		adx.settings = &models.DatasourceSettings{EnableUserTracking: true, ClusterURL: ClusterURL}
		query := backend.DataQuery{
			RefID:         "",
			QueryType:     "",
			MaxDataPoints: 0,
			Interval:      0,
			TimeRange:     backend.TimeRange{},
			JSON:          []byte(`{"resultFormat": "table","querySource": "schema"}`),
		}

		res := adx.handleQuery(context.Background(), query, &backend.User{Login: UserLogin})
		require.Error(t, res.Error)
		require.Equal(t, res.ErrorSource, backend.ErrorSourceDownstream)
		require.Equal(t, res.Error.Error(), "query submitted without database specified and data source does not have a default database")
	})
}

func TestTrustedEndpoints(t *testing.T) {
	tests := []struct {
		name                      string
		URL                       string
		EnforceTrustedEndpoints   bool
		AllowUserTrustedEndpoints bool
		UserTrustedEndpoints      string
		expectError               bool
	}{
		{
			name:                      "allows any endpoint if enforcement is disabled",
			URL:                       "https://random.endpoint.com",
			EnforceTrustedEndpoints:   false,
			AllowUserTrustedEndpoints: false,
			UserTrustedEndpoints:      "",
			expectError:               false,
		},
		{
			name:                      "enforces trusted endpoints - allows default Azure endpoints",
			URL:                       "https://adx.kusto.net",
			EnforceTrustedEndpoints:   true,
			AllowUserTrustedEndpoints: false,
			UserTrustedEndpoints:      "",
			expectError:               false,
		},
		{
			name:                      "enforces trusted endpoints - blocks endpoints not in the allowlist",
			URL:                       "https://random.endpoint.com",
			EnforceTrustedEndpoints:   true,
			AllowUserTrustedEndpoints: false,
			UserTrustedEndpoints:      "",
			expectError:               true,
		},
		{
			name:                      "allows user-defined endpoints",
			URL:                       "https://random.endpoint.com",
			EnforceTrustedEndpoints:   true,
			AllowUserTrustedEndpoints: true,
			UserTrustedEndpoints:      "https://random.endpoint.com",
			expectError:               false,
		},
		{
			name:                      "allows user-defined endpoint with wildcard",
			URL:                       "https://random.endpoint.com",
			EnforceTrustedEndpoints:   true,
			AllowUserTrustedEndpoints: true,
			UserTrustedEndpoints:      "https://*.endpoint.com",
			expectError:               false,
		},
		{
			name:                      "allows user-defined endpoint with multiple entries",
			URL:                       "https://random.fake-endpoint.com",
			EnforceTrustedEndpoints:   true,
			AllowUserTrustedEndpoints: true,
			UserTrustedEndpoints:      "https://*.endpoint.com,https://another.fake-endpoint.com",
			expectError:               false,
		},
		{
			name:                      "blocks user endpoint if AllowUserTrustedEndpoints is false",
			URL:                       "https://random.endpoint.com",
			EnforceTrustedEndpoints:   true,
			AllowUserTrustedEndpoints: false,
			UserTrustedEndpoints:      "https://*.endpoint.com",
			expectError:               true,
		},
		{
			name:                      "blocks user endpoint if not in the allowlist",
			URL:                       "https://random.non-endpoint.com",
			EnforceTrustedEndpoints:   true,
			AllowUserTrustedEndpoints: true,
			UserTrustedEndpoints:      "https://*.endpoint.com",
			expectError:               true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(*testing.T) {
			t.Setenv("GF_PLUGIN_ENFORCE_TRUSTED_ENDPOINTS", fmt.Sprintf("%t", tt.EnforceTrustedEndpoints))
			t.Setenv("GF_PLUGIN_ALLOW_USER_TRUSTED_ENDPOINTS", fmt.Sprintf("%t", tt.AllowUserTrustedEndpoints))
			t.Setenv("GF_PLUGIN_USER_TRUSTED_ENDPOINTS", tt.UserTrustedEndpoints)
			instanceSettings := backend.DataSourceInstanceSettings{
				ID:       1,
				Name:     "test-datasource",
				URL:      "https://help.kusto.windows.net",
				JSONData: []byte(fmt.Sprintf(`{"clusterUrl":"%s","defaultDatabase":"test","azureCredentials":{"authType":"clientsecret","azureCloud":"AzureCloud","tenantId":"test-tenant","clientId":"test-client"}}`, tt.URL)),
				DecryptedSecureJSONData: map[string]string{
					"azureClientSecret": "test-secret",
				},
				Type: "grafana-azure-data-explorer-datasource",
			}
			queryRequest := backend.QueryDataRequest{
				PluginContext: backend.PluginContext{
					DataSourceInstanceSettings: &instanceSettings,
				},
				Queries: []backend.DataQuery{{RefID: "test-query", JSON: []byte(`{"resultFormat": "table","querySource": "schema","database":"test-database"}`)}}}

			ds, err := NewDatasource(context.Background(), instanceSettings)

			require.Nil(t, err)

			adx := ds.(*AzureDataExplorer)

			res, _ := adx.QueryData(context.Background(), &queryRequest)

			if tt.expectError {
				resErr := res.Responses["test-query"].Error
				require.Error(t, resErr)
				require.Contains(t, strings.ToLower(resErr.Error()), fmt.Sprintf("request to endpoint '%s' is not allowed by the datasource", tt.URL))
			}
		})
	}
}

type fakeClient struct{}

func (c *fakeClient) TestKustoRequest(_ context.Context, _ *models.DatasourceSettings, _ *models.Properties, _ map[string]string) error {
	panic("not implemented")
}

func (c *fakeClient) TestARGsRequest(_ context.Context, _ *models.DatasourceSettings, _ *models.Properties, _ map[string]string) error {
	panic("not implemented")
}

func (c *fakeClient) KustoRequest(_ context.Context, cluster string, url string, payload models.RequestPayload, enableUserTracking bool, application string) (*models.TableResponse, error) {
	return kustoRequestMock(url, cluster, payload, enableUserTracking, application)
}

func (c *fakeClient) ARGClusterRequest(_ context.Context, payload models.ARGRequestPayload, additionalHeaders map[string]string) ([]models.ClusterOption, error) {
	return ARGClusterRequestMock(payload, additionalHeaders)
}
