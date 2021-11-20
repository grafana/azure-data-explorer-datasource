package azureauth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/models"
)

// OnBehalfOf uses server credentials [Microsoft Directory (UU)ID + secret] to
// swap OAuth2 access tokens for a dedicated purpose [OAuth2 scope].
// https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow
type OnBehalfOf struct {
	models.DatasourceSettings
	*http.Client
}

// TokenExchange resolves an on-behalf-of access-token.
func (auth *OnBehalfOf) TokenExchange(accessToken string) (string, error) {
	params := make(url.Values)
	params.Set("client_id", auth.ClientID)
	params.Set("client_secret", auth.Secret)
	params.Set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
	params.Set("assertion", accessToken)
	params.Set("scope", auth.ClusterURL+"/.default")
	params.Set("requested_token_use", "on_behalf_of")

	// https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-v2-protocols#endpoints
	tokenURL := "https://login.microsoftonline.com/" + url.PathEscape(auth.TenantID) + "/oauth2/v2.0/token"
	req, err := http.NewRequest(http.MethodGet, tokenURL, strings.NewReader(params.Encode()))
	if err != nil {
		return "", fmt.Errorf("on-behalf-of grant request <%q> instantiation: %w", tokenURL, err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	// HTTP Exchange
	resp, err := auth.Client.PostForm(tokenURL, params)
	if err != nil {
		return "", fmt.Errorf("on-behalf-of grant POST <%q>: %w", tokenURL, err)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("on-behalf-of grant POST <%q> response: %w", tokenURL, err)
	}
	if resp.StatusCode/100 != 2 {
		var r struct {
			Desc string `json:"error_description"`
		}
		_ = json.Unmarshal(body, &r)
		return "", fmt.Errorf("on-behalf-of grant POST <%q> status %q: %q", tokenURL, resp.Status, r.Desc)
	}

	// Parse Essentials
	var r struct {
		Token string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &r); err != nil {
		return "", fmt.Errorf("malformed response from on-behalf-of grant POST <%q>: %w", tokenURL, err)
	}
	if r.Token == "" {
		return "", fmt.Errorf("missing access_token in on-behalf-of grant response <%q>", tokenURL)
	}
	return r.Token, nil
}
