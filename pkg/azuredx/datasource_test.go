package azuredx

import (
	"context"
	"testing"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

var (
	kustoRequestMock func(url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error)
	table            = &models.TableResponse{
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
			JSON:          []byte(`{"resultFormat": "table","querySource": "schema"}`),
		}
		kustoRequestMock = func(url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error) {
			require.Equal(t, ClusterURL+"/v1/rest/query", url)
			require.Contains(t, additionalHeaders, "x-ms-user-id")
			require.Equal(t, UserLogin, additionalHeaders["x-ms-user-id"])
			require.Contains(t, additionalHeaders["x-ms-client-request-id"], UserLogin)
			return table, nil
		}
		res := adx.handleQuery(context.TODO(), query, &backend.User{Login: UserLogin})
		require.NoError(t, res.Error)
	})
}

type fakeClient struct{}

func (c *fakeClient) TestRequest(datasourceSettings *models.DatasourceSettings, properties *models.Properties, additionalHeaders map[string]string) error {
	panic("not implemented")
}

func (c *fakeClient) KustoRequest(url string, payload models.RequestPayload, additionalHeaders map[string]string) (*models.TableResponse, error) {
	return kustoRequestMock(url, payload, additionalHeaders)
}
