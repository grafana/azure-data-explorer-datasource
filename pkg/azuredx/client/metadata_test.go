package client

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFetchAuthMetadata(t *testing.T) {
	t.Run("parses valid metadata response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, metadataPath, r.URL.Path)
			assert.Equal(t, http.MethodGet, r.Method)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{
				"AzureAD": {
					"LoginEndpoint": "https://login.microsoftonline.com",
					"LoginMfaRequired": false,
					"KustoClientAppId": "db662dc1-0cfe-4e1c-a843-19a68e65be58",
					"KustoClientRedirectUri": "https://microsoft/kustoclient",
					"KustoServiceResourceId": "https://kusto.kusto.windows.net",
					"FirstPartyAuthorityUrl": "https://login.microsoftonline.com/f8cdef31-a31e-4b4a-93e4-5f571e91255a"
				}
			}`))
		}))
		defer server.Close()

		info, err := fetchAuthMetadata(context.Background(), server.Client(), server.URL)
		require.NoError(t, err)
		assert.Equal(t, "https://kusto.kusto.windows.net", info.KustoServiceResourceID)
		assert.Equal(t, "https://login.microsoftonline.com", info.LoginEndpoint)
		assert.Equal(t, "db662dc1-0cfe-4e1c-a843-19a68e65be58", info.KustoClientAppID)
	})

	t.Run("returns error on non-2xx status", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer server.Close()

		info, err := fetchAuthMetadata(context.Background(), server.Client(), server.URL)
		require.Error(t, err)
		assert.Nil(t, info)
		assert.Contains(t, err.Error(), "metadata endpoint returned HTTP")
	})

	t.Run("returns error on empty response body", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))
		defer server.Close()

		info, err := fetchAuthMetadata(context.Background(), server.Client(), server.URL)
		require.Error(t, err)
		assert.Nil(t, info)
		assert.Contains(t, err.Error(), "empty response")
	})

	t.Run("returns error on malformed JSON", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`not valid json`))
		}))
		defer server.Close()

		info, err := fetchAuthMetadata(context.Background(), server.Client(), server.URL)
		require.Error(t, err)
		assert.Nil(t, info)
		assert.Contains(t, err.Error(), "failed to parse metadata response")
	})

	t.Run("returns error when KustoServiceResourceId is missing", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"AzureAD": {"LoginEndpoint": "https://login.microsoftonline.com"}}`))
		}))
		defer server.Close()

		info, err := fetchAuthMetadata(context.Background(), server.Client(), server.URL)
		require.Error(t, err)
		assert.Nil(t, info)
		assert.Contains(t, err.Error(), "missing KustoServiceResourceId")
	})

	t.Run("returns error on network failure", func(t *testing.T) {
		httpClient := &http.Client{}
		info, err := fetchAuthMetadata(context.Background(), httpClient, "http://127.0.0.1:1")
		require.Error(t, err)
		assert.Nil(t, info)
		assert.Contains(t, err.Error(), "metadata request failed")
	})

	t.Run("strips query and fragment from cluster URL", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, metadataPath, r.URL.Path)
			assert.Empty(t, r.URL.RawQuery)
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{
				"AzureAD": {
					"KustoServiceResourceId": "https://kusto.kusto.windows.net"
				}
			}`))
		}))
		defer server.Close()

		info, err := fetchAuthMetadata(context.Background(), server.Client(), server.URL+"?foo=bar#frag")
		require.NoError(t, err)
		assert.Equal(t, "https://kusto.kusto.windows.net", info.KustoServiceResourceID)
	})
}
