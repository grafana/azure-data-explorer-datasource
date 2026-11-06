package azuredx

import (
	"testing"

	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
	"github.com/stretchr/testify/require"
)

func env(values map[string]string) func(string) string {
	return func(k string) string { return values[k] }
}

func inMemory() *azsettings.AzureSettings {
	return &azsettings.AzureSettings{
		WorkloadIdentityEnabled:  true,
		WorkloadIdentitySettings: &azsettings.WorkloadIdentitySettings{InMemory: true},
	}
}

func TestApplyAssertionServiceFillsTheURLAndTokenFromThePluginEnvironment(t *testing.T) {
	s := inMemory()
	applyAssertionService(s, env(map[string]string{tokensvcURLEnv: " https://tokensvc.example ", tokensvcMintTokenEnv: "mint\n"}))
	require.Equal(t, "https://tokensvc.example", s.WorkloadIdentitySettings.AssertionURL)
	require.Equal(t, "mint", s.WorkloadIdentitySettings.AssertionCallerToken)
}

func TestApplyAssertionServiceFillsTheTokenFileFromThePluginEnvironment(t *testing.T) {
	s := inMemory()
	applyAssertionService(s, env(map[string]string{tokensvcURLEnv: "https://tokensvc.example", tokensvcTokenFileEnv: " /var/run/tokensvc/token\n"}))
	require.Equal(t, "/var/run/tokensvc/token", s.WorkloadIdentitySettings.AssertionCallerTokenFile)
	require.Empty(t, s.WorkloadIdentitySettings.AssertionCallerToken)

	supplied := inMemory()
	supplied.WorkloadIdentitySettings.AssertionCallerTokenFile = "/from/grafana"
	applyAssertionService(supplied, env(map[string]string{tokensvcTokenFileEnv: "/from/env"}))
	require.Equal(t, "/from/grafana", supplied.WorkloadIdentitySettings.AssertionCallerTokenFile)
}

func TestApplyAssertionServiceNeverOverridesWhatGrafanaSupplied(t *testing.T) {
	s := inMemory()
	s.WorkloadIdentitySettings.AssertionURL = "https://from-grafana.example"
	s.WorkloadIdentitySettings.AssertionCallerToken = "from-grafana"
	applyAssertionService(s, env(map[string]string{tokensvcURLEnv: "https://env.example", tokensvcMintTokenEnv: "env"}))
	require.Equal(t, "https://from-grafana.example", s.WorkloadIdentitySettings.AssertionURL)
	require.Equal(t, "from-grafana", s.WorkloadIdentitySettings.AssertionCallerToken)
}

func TestApplyAssertionServiceDoesNothingUnlessTheInMemoryPathIsOn(t *testing.T) {
	e := env(map[string]string{tokensvcURLEnv: "https://env.example", tokensvcMintTokenEnv: "env", tokensvcTokenFileEnv: "/env/file"})

	off := inMemory()
	off.WorkloadIdentitySettings.InMemory = false
	applyAssertionService(off, e)
	require.Empty(t, off.WorkloadIdentitySettings.AssertionURL)
	require.Empty(t, off.WorkloadIdentitySettings.AssertionCallerToken)
	require.Empty(t, off.WorkloadIdentitySettings.AssertionCallerTokenFile)

	// No workload identity settings at all, and no settings at all: must not panic.
	applyAssertionService(&azsettings.AzureSettings{}, e)
	applyAssertionService(nil, e)
}

func TestApplyAssertionServiceLeavesBothEmptyWhenTheEnvironmentHasNothing(t *testing.T) {
	s := inMemory()
	applyAssertionService(s, env(nil))
	require.Empty(t, s.WorkloadIdentitySettings.AssertionURL)
	require.Empty(t, s.WorkloadIdentitySettings.AssertionCallerToken)
}
