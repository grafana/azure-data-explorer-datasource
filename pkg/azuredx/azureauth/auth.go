// Package azureauth implements Azure authorization.
package azureauth

import (
	"errors"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// BearerToken extracts the client's token.
func BearerToken(req *backend.QueryDataRequest) (accessToken string, err error) {
	s, ok := req.Headers["Authorization"]
	if !ok {
		return "", errors.New("no HTTP Authorization value")
	}

	const prefix = "Bearer "
	// The scheme is case-insensitive 🤦 as per RFC 2617, subsection 1.2.
	if len(s) < len(prefix) || !strings.EqualFold(s[:len(prefix)], prefix) {
		return "", errors.New("unsupported HTTP Authorization scheme")
	}
	return s[len(prefix):], nil
}
