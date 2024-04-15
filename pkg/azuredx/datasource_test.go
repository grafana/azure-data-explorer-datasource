package azuredx

import (
	"context"
	"fmt"
	"testing"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

var (
	kustoRequestMock      func(url string, cluster string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error)
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

	t.Run("When running a query the right args should be passed to KustoRequest", func(t *testing.T) {
		adx = AzureDataExplorer{}
		adx.client = &fakeClient{}
		adx.settings = &models.DatasourceSettings{EnableUserTracking: true, ClusterURL: ClusterURL}
		query := backend.DataQuery{
			RefID:         "",
			QueryType:     "",
			MaxDataPoints: 0,
			Interval:      0,
			TimeRange:     backend.TimeRange{},
			JSON:          []byte(`{"resultFormat": "table","querySource": "schema","database":"test-database"}`),
		}
		kustoRequestMock = func(url string, cluster string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error) {
			require.Equal(t, "/v1/rest/query", url)
			require.Equal(t, ClusterURL, cluster)
			require.Contains(t, additionalHeaders, "x-ms-user-id")
			require.Equal(t, UserLogin, additionalHeaders["x-ms-user-id"])
			require.Contains(t, additionalHeaders["x-ms-client-request-id"], UserLogin)
			require.Equal(t, payload.DB, "test-database")
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
		kustoRequestMock = func(_ string, _ string, payload models.RequestPayload, _ map[string]string) (*models.TableResponse, error) {
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
		require.Equal(t, res.Error, fmt.Errorf("query submitted without database specified and data source does not have a default database"))
	})
}

type fakeClient struct{}

func (c *fakeClient) TestKustoRequest(_ context.Context, _ *models.DatasourceSettings, _ *models.Properties, _ map[string]string) error {
	panic("not implemented")
}

func (c *fakeClient) TestARGsRequest(_ context.Context, _ *models.DatasourceSettings, _ *models.Properties, _ map[string]string) error {
	panic("not implemented")
}

func (c *fakeClient) KustoRequest(_ context.Context, cluster string, url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error) {
	return kustoRequestMock(url, cluster, payload, additionalHeaders)
}

func (c *fakeClient) ARGClusterRequest(_ context.Context, payload models.ARGRequestPayload, additionalHeaders map[string]string) ([]models.ClusterOption, error) {
	return ARGClusterRequestMock(payload, additionalHeaders)
}
