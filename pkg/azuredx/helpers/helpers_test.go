package helpers_test

import (
	"testing"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/helpers"
)

func Test_SanitizeClusterUri(t *testing.T) {
	tests := []struct {
		name       string
		clusterUri string
		expectErr  bool
	}{
		{
			name:       "Valid URI without query",
			clusterUri: "http://example.com",
			expectErr:  false,
		},
		{
			name:       "Valid URI with path",
			clusterUri: "http://example.com/path",
			expectErr:  false,
		},
		{
			name:       "URI with query part",
			clusterUri: "http://example.com?",
			expectErr:  true,
		},
		{
			name:       "URI with query part in path",
			clusterUri: "http://example.com/?",
			expectErr:  true,
		},
		{
			name:       "URI with query part and params in path",
			clusterUri: "http://example.com/test?grafana=test",
			expectErr:  true,
		},
		{
			name:       "URI with query part and parameters",
			clusterUri: "http://example.com?param=value",
			expectErr:  true,
		},
		{
			name:       "URI with fragment part",
			clusterUri: "http://example.com#fragment",
			expectErr:  true,
		},
		{
			name:       "URI with fragment part in path",
			clusterUri: "http://example.com/#",
			expectErr:  true,
		},
		{
			name:       "URI with complete fragment part in path",
			clusterUri: "http://example.com/#fragment",
			expectErr:  true,
		},
		{
			name:       "Invalid URI",
			clusterUri: ":invalid",
			expectErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := helpers.SanitizeClusterUri(tt.clusterUri)
			if (err != nil) != tt.expectErr {
				t.Fatalf("expected error: %v, got: %v", tt.expectErr, err)
			}
		})
	}
}
