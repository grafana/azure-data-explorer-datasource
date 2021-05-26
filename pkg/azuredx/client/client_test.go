package client

import (
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

func TestClient(t *testing.T) {
    testUserLogin := "test-user"
	t.Run("When server returns 200", func(t *testing.T) {
		filename := "./testdata/successful-response.json"
		testDataRes, err := loadTestFile(filename)
		if err != nil {
			t.Errorf("test logic error: file doesnt exist: %s", filename)
		}
		server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			rw.WriteHeader(http.StatusOK)
			_, err := rw.Write(testDataRes)
			if err != nil {
				t.Errorf("test logic error: %s", err.Error())
			}
		}))
		defer server.Close()

		settings := &models.DatasourceSettings{
			ClusterURL: server.URL,
		}
		payload := models.RequestPayload{
			DB: "db-name",
			CSL: "show databases",
		}
		user := &backend.User{
			Login: testUserLogin,
		}
	
		// Use Client & URL from our local test server
		client := New(server.Client())
		table, message, err := client.KustoRequest(settings, payload, "schema", user)
		require.Empty(t, message)	
		require.NoError(t, err)	
		require.NotNil(t, table)	
	})

	t.Run("When server returns 400", func(t *testing.T) {
		filename := "./testdata/error-response.json"
		testDataRes, err := loadTestFile(filename)
		if err != nil {
			t.Errorf("test logic error: file doesnt exist: %s", filename)
		}
		server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			rw.WriteHeader(http.StatusBadRequest)
			_, err := rw.Write(testDataRes)
			if err != nil {
				t.Errorf("test logic error: %s", err.Error())
			}
		}))
		defer server.Close()

		settings := &models.DatasourceSettings{
			ClusterURL: server.URL,
		}
		payload := models.RequestPayload{
			DB: "db-name",
			CSL: "show databases",
		}
		user := &backend.User{
			Login: testUserLogin,
		}
	
		client := New(server.Client())
		table, message, err := client.KustoRequest(settings, payload, "schema", user)
		require.Equal(t, "Request is invalid and cannot be processed: Syntax error: SYN0002: A recognition error occurred. [line:position=1:9]. Query: 'PerfTest take 5'", message)	
		require.Nil(t, table)	
		require.NotNil(t, err)	
	})
}

func loadTestFile(path string) ([]byte, error) {
	jsonBody, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return jsonBody, nil
}