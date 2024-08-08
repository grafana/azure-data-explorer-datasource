package helpers

import (
	"errors"
	"net/url"
	"strings"
)

// SanitizeClusterUri ensures the URI does not contain a query or fragment part
func SanitizeClusterUri(clusterUri string) (string, error) {
	// check for trailing question mark before parsing
	if strings.HasSuffix(clusterUri, "?") {
		return "", errors.New("clusterUri contains invalid query characters")
	}

	// check for trailing question mark before parsing
	if strings.HasSuffix(clusterUri, "#") {
		return "", errors.New("clusterUri contains invalid fragment characters")
	}

	parsedUrl, err := url.Parse(clusterUri)
	if err != nil {
		return "", err
	}

	// check if the URL contains a query part or fragment
	if parsedUrl.RawQuery != "" {
		return "", errors.New("clusterUri contains invalid query characters")
	}

	if parsedUrl.Fragment != "" {
		return "", errors.New("clusterUri contains invalid fragment characters")
	}

	return parsedUrl.String(), nil
}
