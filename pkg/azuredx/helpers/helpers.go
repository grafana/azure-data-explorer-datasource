package helpers

import (
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/experimental/errorsource"
)

// SanitizeClusterUri ensures the URI does not contain a query or fragment part
func SanitizeClusterUri(clusterUri string) (string, error) {
	// check for trailing question mark before parsing
	if strings.HasSuffix(clusterUri, "?") {
		return "", errorsource.DownstreamError(errors.New("invalid clusterUri: clusterUri contains invalid query characters"), false)
	}

	// check for trailing question mark before parsing
	if strings.HasSuffix(clusterUri, "#") {
		return "", errorsource.DownstreamError(errors.New("invalid clusterUri: clusterUri contains invalid fragment characters"), false)
	}

	parsedUrl, err := url.Parse(clusterUri)
	if err != nil {
		return "", errorsource.DownstreamError(fmt.Errorf("invalid clusterUri: %w", err), false)
	}

	// check if the URL contains a query part or fragment
	if parsedUrl.RawQuery != "" {
		return "", errorsource.DownstreamError(errors.New("invalid clusterUri: clusterUri contains invalid query characters"), false)
	}

	if parsedUrl.Fragment != "" {
		return "", errorsource.DownstreamError(errors.New("invalid clusterUri: clusterUri contains invalid fragment characters"), false)
	}

	return parsedUrl.String(), nil
}
