package client

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
	"github.com/grafana/grafana-azure-sdk-go/v2/azusercontext"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

func TestClient(t *testing.T) {
	testUserLogin := "test-user"
	t.Run("When server returns 200", func(t *testing.T) {
		filename := "./testdata/successful-response.json"
		testDataRes, err := loadTestFile(filename)
		if err != nil {
			t.Errorf("test logic error: file doesn't exist: %s", filename)
		}
		server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			rw.WriteHeader(http.StatusOK)
			_, err := rw.Write(testDataRes)
			if err != nil {
				t.Errorf("test logic error: %s", err.Error())
			}
		}))
		defer server.Close()

		payload := models.RequestPayload{
			DB:          "db-name",
			CSL:         "show databases",
			QuerySource: "schema",
		}

		client := &Client{httpClientKusto: server.Client()}
		table, err := client.KustoRequest(context.Background(), server.URL, "", payload, false, "Grafana-ADX")
		require.NoError(t, err)
		require.NotNil(t, table)
	})

	t.Run("When server returns 400", func(t *testing.T) {
		filename := "./testdata/error-response.json"
		testDataRes, err := loadTestFile(filename)
		if err != nil {
			t.Errorf("test logic error: file doesn't exist: %s", filename)
		}
		server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			rw.WriteHeader(http.StatusBadRequest)
			_, err := rw.Write(testDataRes)
			if err != nil {
				t.Errorf("test logic error: %s", err.Error())
			}
		}))
		defer server.Close()

		payload := models.RequestPayload{
			DB:          "db-name",
			CSL:         "show databases",
			QuerySource: "schema",
		}

		client := &Client{httpClientKusto: server.Client()}
		table, err := client.KustoRequest(context.Background(), server.URL, "", payload, false, "Grafana-ADX")
		require.Nil(t, table)
		require.NotNil(t, err)
		require.Contains(t, err.Error(), "Request is invalid and cannot be processed: Syntax error: SYN0002: A recognition error occurred. [line:position=1:9]. Query: 'PerfTest take 5'")
	})

	t.Run("Headers are set - excluding tracking headers", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			require.Equal(t, "application/json", req.Header.Get("Accept"))
			require.Equal(t, "application/json", req.Header.Get("Content-Type"))
			require.NotEmpty(t, req.Header.Get("x-ms-app"), "Header 'x-ms-app' should not be empty")
		}))
		defer server.Close()

		payload := models.RequestPayload{
			DB:          "db-name",
			CSL:         "show databases",
			QuerySource: "schema",
		}

		client := &Client{httpClientKusto: server.Client()}
		table, err := client.KustoRequest(context.Background(), server.URL, "", payload, false, "Grafana-ADX")
		require.Nil(t, table)
		require.NotNil(t, err)
	})

	t.Run("Headers are set - including tracking headers", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			require.Equal(t, "application/json", req.Header.Get("Accept"))
			require.Equal(t, "application/json", req.Header.Get("Content-Type"))
			require.Equal(t, "Grafana-ADX", req.Header.Get("x-ms-app"))
			require.Contains(t, req.Header.Get("x-ms-client-request-id"), "KGC.schema")
			require.Contains(t, req.Header.Get("x-ms-user-id"), testUserLogin)
		}))
		defer server.Close()

		payload := models.RequestPayload{
			DB:          "db-name",
			CSL:         "show databases",
			QuerySource: "schema",
		}

		client := &Client{httpClientKusto: server.Client()}
		ctx := context.Background()
		ctxWithUser := azusercontext.WithCurrentUser(ctx, azusercontext.CurrentUserContext{
			User: &backend.User{
				Login: "test-user",
			},
		})
		table, err := client.KustoRequest(ctxWithUser, server.URL, "", payload, true, "Grafana-ADX")
		require.Nil(t, table)
		require.NotNil(t, err)
	})

}

func loadTestFile(path string) ([]byte, error) {
	jsonBody, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return jsonBody, nil
}
