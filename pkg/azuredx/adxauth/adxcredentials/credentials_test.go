package adxcredentials

import (
	"testing"

	"github.com/grafana/grafana-azure-sdk-go/azsettings"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeAzureCloud_KnownClouds(t *testing.T) {
	tests := []struct {
		description     string
		legacyCloud     string
		normalizedCloud string
	}{
		{
			legacyCloud:     azureMonitorPublic,
			normalizedCloud: azsettings.AzurePublic,
		},
		{
			legacyCloud:     azureMonitorChina,
			normalizedCloud: azsettings.AzureChina,
		},
		{
			legacyCloud:     azureMonitorUSGovernment,
			normalizedCloud: azsettings.AzureUSGovernment,
		},
		{
			legacyCloud:     "",
			normalizedCloud: azsettings.AzurePublic,
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			actualCloud, err := normalizeAzureCloud(tt.legacyCloud)
			require.NoError(t, err)

			assert.Equal(t, tt.normalizedCloud, actualCloud)
		})
	}
}

func TestNormalizeAzureCloud_UnknownClouds(t *testing.T) {
	t.Run("should fail when cloud is unknown", func(t *testing.T) {
		legacyCloud := "unknown"

		_, err := normalizeAzureCloud(legacyCloud)
		assert.Error(t, err)
	})
}
