package client

import (
	"context"
	"fmt"
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
)

const authenticationMiddlewareName = "Authentication"

var logError = backend.Logger.Error

type TokenProvider interface {
	GetAccessToken(ctx context.Context) (string, error)
}

func AuthMiddleware(tokenProvider TokenProvider) httpclient.Middleware {
	return httpclient.NamedMiddlewareFunc(authenticationMiddlewareName, func(opts httpclient.Options, next http.RoundTripper) http.RoundTripper {
		return httpclient.RoundTripperFunc(func(req *http.Request) (*http.Response, error) {
			token, err := tokenProvider.GetAccessToken(req.Context())
			if err != nil {
				logError("failed to retrieve azure access token", "error", err)
				return next.RoundTrip(req)
			}
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

			res, err := next.RoundTrip(req)
			return res, err
		})
	})
}
