// Package azureauth provides authorization utilities for the Azure cloud.
package azureauth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
)

var onBehalfOfLatencySeconds = prometheus.NewHistogramVec(prometheus.HistogramOpts{
	Namespace: "grafana",
	Subsystem: "plugin_adx",
	Name:      "obo_latency_seconds",
	Help:      "On-behalf-of token exchange duration.",
	Buckets:   []float64{0.01, 0.05, 0.10, 0.20, 0.40, 1.00},
}, []string{"http_status"})

func init() {
	prometheus.MustRegister(onBehalfOfLatencySeconds)
}

// ServiceCredentials provides authorization for cloud service usage.
type ServiceCredentials struct {
	models.DatasourceSettings
	// PostForm is an http.Client method.
	PostForm func(url string, data url.Values) (*http.Response, error)
	// ServicePrincipalToken resolves service credentials.
	ServicePrincipalToken func(context.Context) (token string, err error)
}

// ServicePrincipalAuthorization returns an HTTP Authorization-header value which
// represents the service principal.
func (c *ServiceCredentials) ServicePrincipalAuthorization(ctx context.Context) (string, error) {
	token, err := c.ServicePrincipalToken(ctx)
	if err != nil {
		return "", fmt.Errorf("service principal token unavailable: %w", err)
	}
	return "Bearer " + token, nil
}

// QueryDataAuthorization returns an HTTP Authorization-header value which
// represents the respective request.
func (c *ServiceCredentials) QueryDataAuthorization(req *backend.QueryDataRequest) (string, error) {
	switch {
	case c.OnBehalfOf:
		return c.queryDataOnBehalfOf(req)

	// TODO(pascaldekloe): case c.ClientCreds [oauthPassThru]

	default:
		backend.Logger.Debug("using service principal token for data request")
		ctx := context.Background()
		if c.QueryTimeout != 0 {
			var cancel context.CancelFunc
			ctx, cancel = context.WithTimeout(ctx, c.QueryTimeout)
			defer cancel()
		}
		return c.ServicePrincipalAuthorization(ctx)
	}
}

func (c *ServiceCredentials) queryDataOnBehalfOf(req *backend.QueryDataRequest) (string, error) {
	user := req.PluginContext.User // do nil-check once for all
	if user == nil {
		return "", errors.New("non-user requests not permitted with on-behalf-of configuration")
	}

	// Azure requires an ID token (instead of an access token) for the exchange.
	userToken, ok := req.Headers["X-ID-Token"]
	if !ok {
		if _, ok := req.Headers["Authorization"]; !ok {
			return "", errors.New("system accounts are denied with on-behalf-of configuration")
		}

		backend.Logger.Error("ID token absent for data request; enable them on the Azure portal under: “App Registrations” → the respective application → “Manage” → “Authentication”", "user", user.Login)
		return "", errors.New("ID token absent for data request")
	}

	onBehalfOfToken, err := c.onBehalfOf(userToken)
	if err != nil {
		backend.Logger.Error(err.Error(), "user", user.Login)
		// Don't leak any context to the end-user.
		return "", errors.New("on-behalf-of token exchange failed for data request")
	}
	backend.Logger.Debug("aquired on-behalf-of token for data request")

	return "Bearer " + onBehalfOfToken, nil
}

// OnBehalfOf resolves a token which impersonates the subject of userToken.
// UserToken has to be an ID token. See the following link for more detail.
// https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow
func (c *ServiceCredentials) onBehalfOf(userToken string) (onBehalfOfToken string, err error) {
	params := make(url.Values)
	params.Set("client_id", c.ClientID)
	params.Set("client_secret", c.Secret)
	params.Set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
	params.Set("assertion", userToken)
	params.Set("scope", c.ClusterURL+"/.default")
	params.Set("requested_token_use", "on_behalf_of")

	// https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-v2-protocols#endpoints
	tokenURL := "https://login.microsoftonline.com/" + url.PathEscape(c.TenantID) + "/oauth2/v2.0/token"
	req, err := http.NewRequest("GET", tokenURL, strings.NewReader(params.Encode()))
	if err != nil {
		return "", fmt.Errorf("on-behalf-of grant request <%q> instantiation: %w", tokenURL, err)
	}
	req.Header.Set("Accept", "application/json")

	// HTTP Exchange
	reqStart := time.Now()
	resp, err := c.PostForm(tokenURL, params)
	if err != nil {
		return "", fmt.Errorf("on-behalf-of grant POST <%q>: %w", tokenURL, err)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("on-behalf-of grant POST <%q> response: %w", tokenURL, err)
	}
	onBehalfOfLatencySeconds.WithLabelValues(strconv.Itoa(resp.StatusCode)).Observe(float64(time.Since(reqStart)) / float64(time.Second))
	if resp.StatusCode/100 != 2 {
		var deny struct {
			Desc string `json:"error_description"`
		}
		_ = json.Unmarshal(body, &deny)
		return "", fmt.Errorf("on-behalf-of grant POST <%q> status %q: %q", tokenURL, resp.Status, deny.Desc)
	}

	// Parse Essentials
	var grant struct {
		Token string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &grant); err != nil {
		return "", fmt.Errorf("malformed response from on-behalf-of grant POST <%q>: %w", tokenURL, err)
	}
	if grant.Token == "" {
		return "", fmt.Errorf("missing access_token in on-behalf-of grant response <%q>", tokenURL)
	}
	return grant.Token, nil
}
