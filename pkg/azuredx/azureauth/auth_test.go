package azureauth

import (
	"context"
	"testing"

	"github.com/AzureAD/microsoft-authentication-library-for-go/apps/confidential"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func TestOnBehalfOf(t *testing.T) {
	golden := []struct {
		RequestUser                *backend.User
		RequestAuthorizationHeader string
		RequestIDTokenHeader       string

		ShouldRequestToken bool
		ExpectedError      string
	}{
		// happy flow
		0: {
			RequestUser:          &backend.User{Login: "alice"},
			RequestIDTokenHeader: "ID-TOKEN",
			ShouldRequestToken:   true,
			ExpectedError:        "",
		},

		1: {
			RequestUser:          nil,
			RequestIDTokenHeader: "ID-TOKEN",
			ShouldRequestToken:   false,
			ExpectedError:        "non-user requests not permitted with on-behalf-of configuration",
		},

		2: {
			RequestUser:        &backend.User{Login: "alice"},
			ShouldRequestToken: false,
			ExpectedError:      "system accounts are denied with on-behalf-of configuration",
		},

		3: {
			RequestUser:                &backend.User{Login: "alice"},
			RequestAuthorizationHeader: "arbitrary",
			ShouldRequestToken:         false,
			ExpectedError:              "ID token absent for data request",
		},
	}

	for index, g := range golden {
		// compose request
		var req backend.QueryDataRequest
		req.PluginContext.User = g.RequestUser
		req.Headers = make(map[string]string)
		if g.RequestAuthorizationHeader != "" {
			req.Headers["Authorization"] = g.RequestAuthorizationHeader
		}
		if g.RequestIDTokenHeader != "" {
			req.Headers["X-ID-Token"] = g.RequestIDTokenHeader
		}

		// setup & test
		fakeAADClient := &FakeAADClient{}

		c := &ServiceCredentialsImpl{
			tokenCache: newCache(),
			aadClient:  fakeAADClient,
		}
		c.OnBehalfOf = true

		auth, err := c.QueryDataAuthorization(context.Background(), &req)

		switch {
		case err != nil:
			switch {
			case g.ExpectedError == "":
				t.Errorf("%d: got error %q", index, err)
			case err.Error() != g.ExpectedError:
				t.Errorf("%d: got error %q, expected %q", index, err, g.ExpectedError)
			}

		case g.ExpectedError != "":
			t.Errorf("%d: got authorization %q, want error %q", index, auth, g.ExpectedError)

		case g.ShouldRequestToken != fakeAADClient.TokenRequested:
			t.Errorf("%d: should request token = %t, requested = %t", index, g.ShouldRequestToken, fakeAADClient.TokenRequested)
		}
	}
}

// TODO test feature flag disabled too -> should have same result
func TestOnBehalfOfDisabled(t *testing.T) {
	// compose request
	var req backend.QueryDataRequest
	req.PluginContext.User = &backend.User{Login: "alice"}
	req.Headers = make(map[string]string)
	req.Headers["X-ID-Token"] = "ID-TOKEN"

	// setup & test
	fakeTokenProvider := &FakeTokenProvider{}

	c := &ServiceCredentialsImpl{
		tokenCache: newCache(),
		tokenProvider:  fakeTokenProvider,
	}
	c.OnBehalfOf = false

	auth, err := c.QueryDataAuthorization(context.Background(), &req)

	if err != nil {
		t.Errorf("got error %q", err)
	}

	if !fakeTokenProvider.TokenRequested {
		t.Errorf("got %q, expected 'TokenRequested", auth)
	}
}

type FakeAADClient struct {
	TokenRequested bool
}

func (c *FakeAADClient) AcquireTokenOnBehalfOf(_ context.Context, _ string, _ []string) (confidential.AuthResult, error) {
	c.TokenRequested = true
	return confidential.AuthResult{}, nil
}

type FakeTokenProvider struct {
	TokenRequested bool
}

func (tp *FakeTokenProvider) GetAccessToken(_ context.Context, _ []string) (string, error) {
	tp.TokenRequested = true
	return "Bearer ok", nil
}
