package azuredx

import (
	"os"
	"strings"

	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
)

// With the workloadIdentityInMemory feature toggle on, the Azure SDK asks a token service for a
// signed client assertion instead of reading a token file. Grafana forwards the toggle and the
// workload identity settings to this plugin, but not where that service is, so the plugin reads
// it from its own configuration.
//
// reaches the plugin as the two variables below. The mint token is only needed while the token
// service cannot yet identify the stack from the ID token Grafana forwards with each request.
// This is a temporary workaround until the token service can fully identify the stack from the ID token
const (
	tokensvcURLEnv       = "GF_PLUGIN_TOKENSVC_URL"
	tokensvcMintTokenEnv = "GF_PLUGIN_TOKENSVC_MINT_TOKEN"
	// stackIDEnv names the stack to ask for when Grafana reports none (local runs). On Cloud the
	// stack comes from the request's namespace and this is not set.
	stackIDEnv = "GF_PLUGIN_TOKENSVC_STACK_ID"
)

// applyAssertionService completes the in-memory workload identity settings with the token
// service this plugin is configured for. It does nothing unless the in-memory path is on, and it
// never overrides a value Grafana itself supplied.
func applyAssertionService(settings *azsettings.AzureSettings, lookupEnv func(string) string) {
	if settings == nil {
		return
	}
	wi := settings.WorkloadIdentitySettings
	if wi == nil || !wi.InMemory {
		return
	}
	if wi.AssertionURL == "" {
		wi.AssertionURL = strings.TrimSpace(lookupEnv(tokensvcURLEnv))
	}
	if wi.AssertionCallerToken == "" {
		wi.AssertionCallerToken = strings.TrimSpace(lookupEnv(tokensvcMintTokenEnv))
	}
	if wi.StackID == "" {
		wi.StackID = strings.TrimSpace(lookupEnv(stackIDEnv))
	}
}

// processEnv is os.Getenv, as a seam for tests.
var processEnv = os.Getenv
