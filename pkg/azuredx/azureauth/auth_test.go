package azureauth

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func TestQueryDataAuthorization(t *testing.T) {
	// reusables
	const testToken = "some.test.token"
	wantNoHTTP := func(*http.Request) (*http.Response, error) {
		return nil, errors.New("unwanted HTTP invocation")
	}

	golden := []struct {
		Want    string
		WantErr string

		// HTTP client representation
		HTTPDoMock func(*http.Request) (*http.Response, error)

		*backend.User
		AuthHeader    string
		IDTokenHeader string
	}{
		// happy flow
		0: {Want: "Bearer test.exchange.token", WantErr: "",
			HTTPDoMock: func(req *http.Request) (*http.Response, error) {
				const wantURL = "https://login.microsoftonline.com/0AF0528A-F473-4E0C-891F-3FF8ACDC4E5F/oauth2/v2.0/token"
				if s := req.URL.String(); s != wantURL {
					return nil, fmt.Errorf("got URL %q, want %q", s, wantURL)
				}

				if err := req.ParseForm(); err != nil {
					return nil, fmt.Errorf("test form values: %w", err)
				}
				if s := req.PostForm.Get("assertion"); s != testToken {
					return nil, fmt.Errorf("POST with assertion pramameter %q, want %q", s, testToken)
				}

				return &http.Response{
					StatusCode: 200,
					Body: io.NopCloser(strings.NewReader(`{
						"access_token": "test.exchange.token"
					}`)),
				}, nil
			},
			IDTokenHeader: testToken,
			User:          &backend.User{Login: "alice"}},

		1: {Want: "", WantErr: "non-user requests not permitted with on-behalf-of configuration",
			HTTPDoMock:    wantNoHTTP,
			IDTokenHeader: testToken,
			User:          nil},

		2: {Want: "", WantErr: "system accounts are denied with on-behalf-of configuration",
			HTTPDoMock: wantNoHTTP,
			User:       &backend.User{Login: "alice"}},

		3: {Want: "", WantErr: "ID token absent for data request",
			HTTPDoMock: wantNoHTTP,
			AuthHeader: "arbitrary",
			User:       &backend.User{Login: "alice"}},
	}

	for index, g := range golden {
		// compose request
		var req backend.QueryDataRequest
		req.PluginContext.User = g.User
		req.Headers = make(map[string]string)
		if g.AuthHeader != "" {
			req.Headers["Authorization"] = g.AuthHeader
		}
		if g.IDTokenHeader != "" {
			req.Headers["X-ID-Token"] = g.IDTokenHeader
		}

		// setup & test
		c := &ServiceCredentials{HTTPDo: g.HTTPDoMock}
		c.TenantID = "0AF0528A-F473-4E0C-891F-3FF8ACDC4E5F"
		c.OnBehalfOf = true
		c.tokenCache = newCache()
		auth, err := c.QueryDataAuthorization(context.Background(), &req)
		switch {
		case err != nil:
			switch {
			case g.WantErr == "":
				t.Errorf("%d: got error %q", index, err)
			case err.Error() != g.WantErr:
				t.Errorf("%d: got error %q, want %q", index, err, g.WantErr)
			}

		case g.WantErr != "":
			t.Errorf("%d: got authorization %q, want error %q", index, auth, g.WantErr)

		case auth != g.Want:
			t.Errorf("%d: got authorization %q, want %q", index, auth, g.Want)
		}
	}
}
