package azureauth

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func TestQueryDataAuthorization(t *testing.T) {
	// reusables
	const testToken = "some.test.token"
	wantNoHTTP := func(url string, data url.Values) (*http.Response, error) {
		return nil, errors.New("unwanted HTTP invocation")
	}

	golden := []struct {
		Want    string
		WantErr string

		// HTTP client representation
		PostFormMock func(url string, data url.Values) (*http.Response, error)

		*backend.User
		AuthHeader    string
		IDTokenHeader string
	}{
		// happy flow
		0: {Want: "Bearer test.exchange.token", WantErr: "",
			PostFormMock: func(url string, data url.Values) (*http.Response, error) {
				if s := data.Get("assertion"); s != testToken {
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
			PostFormMock:  wantNoHTTP,
			IDTokenHeader: testToken,
			User:          nil},

		2: {Want: "", WantErr: "system accounts are denied with on-behalf-of configuration",
			PostFormMock: wantNoHTTP,
			User:         &backend.User{Login: "alice"}},

		3: {Want: "", WantErr: "ID token absent for data request",
			PostFormMock: wantNoHTTP,
			AuthHeader:   "arbitrary",
			User:         &backend.User{Login: "alice"}},
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
		c := &ServiceCredentials{PostForm: g.PostFormMock}
		c.OnBehalfOf = true
		auth, err := c.QueryDataAuthorization(&req)
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
