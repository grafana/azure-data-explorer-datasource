package azuredx

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"golang.org/x/oauth2/microsoft"

	"github.com/grafana/grafana_plugin_model/go/datasource"
	"github.com/hashicorp/go-hclog"
	"golang.org/x/oauth2/clientcredentials"
)

type QueryModel struct {
	Format    string `json:"format"`
	RawQuery  string `json:"rawQuery"`
	QueryType string `json:"queryType`
}

type DataSourceData struct {
	ClientID        string `json:"clientId"`
	TenantID        string `json:"tenantId"`
	ClusterURL      string `json:"clusterUrl"`
	DefaultDatabase string `json:"defaultDatabase"`
	Secret          string `json:-`
}

type Client struct {
	*http.Client
	*DataSourceData
	Logger hclog.Logger
}

type RequestPayload struct {
	DB         string `json:"db"`
	CSL        string `json:"csl"`
	Properties string `json:"properties"`
}

func NewDataSourceData(dInfo *datasource.DatasourceInfo) (*DataSourceData, error) {
	d := DataSourceData{}
	err := json.Unmarshal([]byte(dInfo.GetJsonData()), &d)
	if err != nil {
		return nil, err
	}
	d.Secret = dInfo.GetDecryptedSecureJsonData()["clientSecret"]
	return &d, nil
}

func NewClient(ctx context.Context, dInfo *datasource.DatasourceInfo) (*Client, error) {
	c := Client{}
	var err error
	c.DataSourceData, err = NewDataSourceData(dInfo)
	if err != nil {
		return nil, err
	}

	conf := clientcredentials.Config{
		ClientID:     c.ClientID,
		ClientSecret: c.Secret,
		TokenURL:     microsoft.AzureADEndpoint(c.TenantID).TokenURL,
		Scopes:       []string{"https://kusto.kusto.windows.net/.default"},
	}

	c.Client = conf.Client(ctx)
	return &c, nil
}

func (c *Client) TestRequest() (*TableResponse, error) {
	var buf bytes.Buffer
	err := json.NewEncoder(&buf).Encode(RequestPayload{
		CSL: ".show databases schema | limit 5",
		DB:  c.DefaultDatabase,
	})
	if err != nil {
		return nil, err
	}

	resp, err := c.Post(c.ClusterURL+"/v1/rest/query", "application/json", &buf)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode > 299 {
		return nil, fmt.Errorf("HTTP error: %v", resp.Status)
	}
	tr := &TableResponse{}
	defer resp.Body.Close()
	json.NewDecoder(resp.Body).Decode(tr)
	if err != nil {
		return nil, err
	}
	return tr, nil
}

type TableResponse struct {
	Tables []struct {
		TableName string `json:"TableName"`
		Columns   []struct {
			ColumnName string `json:"ColumnName"`
			DataType   string `json:"DataType"`
			ColumnType string `json:"ColumnType"`
		} `json:"Columns"`
		Rows [][]string `json:"Rows"`
	} `json:"Tables"`
}
