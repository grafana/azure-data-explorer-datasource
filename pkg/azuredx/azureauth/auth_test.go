package azureauth

import (
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func TestClientToken(t *testing.T) {
	golden := []struct {
		Header string
		Token  string
		Error  string
	}{
		{"bearer metoken", "metoken", ""},
		// all base64 URL encoding characters plus dot for JWT simulation
		{"Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.",
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.", ""},

		// Error Scenario
		{"", "", "no HTTP Authorization value"},
		{"foo bar", "", "unsupported HTTP Authorization scheme"},
	}

	for _, g := range golden {
		var headers map[string]string
		if g.Header != "" {
			headers = map[string]string{"Authorization": g.Header}
		}

		token, err := BearerToken(&backend.QueryDataRequest{Headers: headers})
		switch {
		case err != nil && err.Error() != g.Error:
			t.Errorf("%q got error %q, want %q", g.Header, err, g.Error)
		case err == nil && g.Error != "":
			t.Errorf("%q got no error, want %q", g.Header, g.Error)
		case token != g.Token:
			t.Errorf("%q got token %q, want %q", g.Header, token, g.Token)
		}
	}
}
