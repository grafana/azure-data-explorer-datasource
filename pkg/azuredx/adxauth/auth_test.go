package adxauth

import (
	"context"
	"testing"

	"github.com/AzureAD/microsoft-authentication-library-for-go/apps/confidential"
	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/adxauth/adxusercontext"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
)

func TestOnBehalfOf(t *testing.T) {
	golden := []struct {
		CurrentUser        *adxusercontext.CurrentUserContext
		OnBehalfOfDisabled bool
		ShouldRequestToken bool
		ExpectedError      string
	}{
		// happy flow
		0: {
			CurrentUser: &adxusercontext.CurrentUserContext{
				User:    &backend.User{Login: "alice"},
				IdToken: "ID-TOKEN",
			},
			ShouldRequestToken: true,
			ExpectedError:      "",
		},

		1: {
			CurrentUser:        nil,
			ShouldRequestToken: false,
			ExpectedError:      "user context not configured",
		},

		2: {
			CurrentUser: &adxusercontext.CurrentUserContext{
				User: &backend.User{Login: "alice"},
			},
			ShouldRequestToken: false,
			ExpectedError:      "user context doesn't have ID token",
		},

		3: {
			CurrentUser: &adxusercontext.CurrentUserContext{
				User:    &backend.User{Login: "alice"},
				IdToken: "ID-TOKEN",
			},
			OnBehalfOfDisabled: true,
			ShouldRequestToken: false,
		},
	}

	for index, g := range golden {
		// setup & test
		fakeAADClient := &FakeAADClient{}
		fakeTokenProvider := &FakeTokenProvider{}

		c := &ServiceCredentialsImpl{
			tokenProvider: fakeTokenProvider,
		}
		if !g.OnBehalfOfDisabled {
			c.aadClient = fakeAADClient
		}

		ctx := context.Background()
		if g.CurrentUser != nil {
			ctx = adxusercontext.WithCurrentUser(ctx, *g.CurrentUser)
		}

		auth, err := c.GetAccessToken(ctx)

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

		case g.OnBehalfOfDisabled:
			assert.Equal(t, fakeTokenProvider.TokenRequested, true)
			assert.Equal(t, fakeAADClient.TokenRequested, false)

		case g.ShouldRequestToken != fakeAADClient.TokenRequested:
			t.Errorf("%d: should request token = %t, requested = %t", index, g.ShouldRequestToken, fakeAADClient.TokenRequested)

		default:
			assert.Equal(t, fakeTokenProvider.TokenRequested, false)
		}
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
