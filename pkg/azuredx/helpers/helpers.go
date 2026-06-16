package helpers

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// SanitizeClusterUri ensures the URI does not contain a query or fragment part
func SanitizeClusterUri(clusterUri string) (string, error) {
	// check for trailing question mark before parsing
	if strings.HasSuffix(clusterUri, "?") {
		return "", backend.DownstreamError(errors.New("invalid clusterUri: clusterUri contains invalid query characters"))
	}

	// check for trailing question mark before parsing
	if strings.HasSuffix(clusterUri, "#") {
		return "", backend.DownstreamError(errors.New("invalid clusterUri: clusterUri contains invalid fragment characters"))
	}

	parsedUrl, err := url.Parse(clusterUri)
	if err != nil {
		return "", backend.DownstreamError(fmt.Errorf("invalid clusterUri: %w", err))
	}

	// check if the URL contains a query part or fragment
	if parsedUrl.RawQuery != "" {
		return "", backend.DownstreamError(errors.New("invalid clusterUri: clusterUri contains invalid query characters"))
	}

	if parsedUrl.Fragment != "" {
		return "", backend.DownstreamError(errors.New("invalid clusterUri: clusterUri contains invalid fragment characters"))
	}

	return parsedUrl.String(), nil
}

func HandleResponseBodyClose(resp *http.Response) {
	if err := resp.Body.Close(); err != nil {
		backend.Logger.Warn("Error closing response body: %s", err.Error())
	}
}
