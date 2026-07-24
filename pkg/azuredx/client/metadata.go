package client

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	json "github.com/json-iterator/go"
)

const metadataPath = "/v1/rest/auth/metadata"

type authMetadataResponse struct {
	AzureAD cloudInfo `json:"AzureAD"`
}

type cloudInfo struct {
	LoginEndpoint          string `json:"LoginEndpoint"`
	LoginMfaRequired       bool   `json:"LoginMfaRequired"`
	KustoClientAppID       string `json:"KustoClientAppId"`
	KustoClientRedirectURI string `json:"KustoClientRedirectUri"`
	KustoServiceResourceID string `json:"KustoServiceResourceId"`
	FirstPartyAuthorityURL string `json:"FirstPartyAuthorityUrl"`
}

// fetchAuthMetadata makes an unauthenticated GET request to the cluster's
// /v1/rest/auth/metadata endpoint and returns the parsed cloud info.
func fetchAuthMetadata(ctx context.Context, httpClient *http.Client, clusterURL string) (*cloudInfo, error) {
	u, err := url.Parse(clusterURL)
	if err != nil {
		return nil, fmt.Errorf("invalid cluster URL %q: %w", clusterURL, err)
	}
	u.Path = metadataPath
	u.RawQuery = ""

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create metadata request: %w", err)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("metadata request failed: %w", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			backend.Logger.Error("error closing response body", "error", err)
		}
	}()

	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("metadata endpoint returned HTTP %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read metadata response: %w", err)
	}

	if len(body) == 0 {
		return nil, fmt.Errorf("metadata endpoint returned empty response")
	}

	var metadata authMetadataResponse
	if err := json.Unmarshal(body, &metadata); err != nil {
		return nil, fmt.Errorf("failed to parse metadata response: %w", err)
	}

	if metadata.AzureAD.KustoServiceResourceID == "" {
		return nil, fmt.Errorf("metadata response missing KustoServiceResourceId")
	}

	return &metadata.AzureAD, nil
}
