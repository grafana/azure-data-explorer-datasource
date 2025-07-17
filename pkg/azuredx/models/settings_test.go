package models

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/suite"
)

type TestSettingsSuite struct {
	suite.Suite
}

func TestSettings(t *testing.T) {
	suite.Run(t, new(TestSettingsSuite))
}

func (s *TestSettingsSuite) TestFormatTimeout() {
	r := s.Require()
	tests := []struct {
		name     string
		duration time.Duration
		expected string
		err      error
	}{
		{
			name:     "one hour",
			duration: time.Hour,
			expected: "01:00:00",
			err:      nil,
		},
		{
			name:     "less than one minute",
			duration: time.Second * 30,
			expected: "00:00:30",
			err:      nil,
		},
		{
			name:     "more than one minute",
			duration: time.Minute * 2,
			expected: "00:02:00",
			err:      nil,
		},
		{
			name:     "more than one hour",
			duration: time.Hour * 2,
			expected: "",
			err:      fmt.Errorf("timeout must be one hour or less"),
		},
	}
	for _, tt := range tests {
		s.Run(tt.name, func() {
			result, err := formatTimeout(tt.duration)
			r.Equal(tt.expected, result)
			r.Equal(tt.err, err)
		})
	}
}

func (s *TestSettingsSuite) TestLoad() {
	r := s.Require()

	tests := []struct {
		name           string
		config         backend.DataSourceInstanceSettings
		expectedError  string
		expectedResult *DatasourceSettings
		setupEnv       func()
		cleanupEnv     func()
	}{
		{
			name: "valid JSON with all fields",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{
					"clusterUrl": "https://test.kusto.windows.net",
					"defaultDatabase": "testdb",
					"dataConsistency": "strong",
					"cacheMaxAge": "5m",
					"dynamicCaching": true,
					"enableUserTracking": true,
					"application": "grafana",
					"queryTimeout": "30s"
				}`),
			},
			expectedResult: &DatasourceSettings{
				ClusterURL:         "https://test.kusto.windows.net",
				DefaultDatabase:    "testdb",
				DataConsistency:    "strong",
				CacheMaxAge:        "5m",
				DynamicCaching:     true,
				EnableUserTracking: true,
				Application:        "grafana",
				QueryTimeoutRaw:    "30s",
				QueryTimeout:       30 * time.Second,
				ServerTimeoutValue: "00:00:30",
			},
		},
		{
			name: "minimal valid JSON",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{
					"clusterUrl": "https://minimal.kusto.windows.net"
				}`),
			},
			expectedResult: &DatasourceSettings{
				ClusterURL:         "https://minimal.kusto.windows.net",
				QueryTimeout:       30 * time.Second,
				ServerTimeoutValue: "00:00:30",
			},
		},
		{
			name: "empty JSON data",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{}`),
			},
			expectedResult: &DatasourceSettings{
				QueryTimeout:       30 * time.Second,
				ServerTimeoutValue: "00:00:30",
			},
		},
		{
			name: "no JSON data",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(``),
			},
			expectedResult: &DatasourceSettings{
				QueryTimeout:       30 * time.Second,
				ServerTimeoutValue: "00:00:30",
			},
		},
		{
			name: "invalid JSON",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{invalid json`),
			},
			expectedError: "could not unmarshal DatasourceSettings json",
		},
		{
			name: "cluster URL with trailing slash",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{
					"clusterUrl": "https://test.kusto.windows.net/"
				}`),
			},
			expectedResult: &DatasourceSettings{
				ClusterURL:         "https://test.kusto.windows.net/",
				QueryTimeout:       30 * time.Second,
				ServerTimeoutValue: "00:00:30",
			},
		},
		{
			name: "invalid cluster URL",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{
					"clusterUrl": "https://test.kusto.windows.net?invalid=query"
				}`),
			},
			expectedError: "invalid datasource endpoint configuration",
		},
		{
			name: "invalid query timeout",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{
					"queryTimeout": "invalid-duration"
				}`),
			},
			expectedError: "time: invalid duration",
		},
		{
			name: "query timeout over one hour",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{
					"queryTimeout": "2h"
				}`),
			},
			expectedError: "timeout must be one hour or less",
		},
		{
			name: "with environment variables for trusted endpoints",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{
					"clusterUrl": "https://test.kusto.windows.net"
				}`),
			},
			setupEnv: func() {
				err := os.Setenv("GF_PLUGIN_ENFORCE_TRUSTED_ENDPOINTS", "true")
				if err != nil {
					panic(err)
				}
				err = os.Setenv("GF_PLUGIN_ALLOW_USER_TRUSTED_ENDPOINTS", "true")
				if err != nil {
					panic(err)
				}
				err = os.Setenv("GF_PLUGIN_USER_TRUSTED_ENDPOINTS", "https://custom1.com,https://custom2.com")
				if err != nil {
					panic(err)
				}
			},
			cleanupEnv: func() {
				err := os.Unsetenv("GF_PLUGIN_ENFORCE_TRUSTED_ENDPOINTS")
				if err != nil {
					panic(err)
				}
				err = os.Unsetenv("GF_PLUGIN_ALLOW_USER_TRUSTED_ENDPOINTS")
				if err != nil {
					panic(err)
				}
				err = os.Unsetenv("GF_PLUGIN_USER_TRUSTED_ENDPOINTS")
				if err != nil {
					panic(err)
				}
			},
			expectedResult: &DatasourceSettings{
				ClusterURL:                "https://test.kusto.windows.net",
				QueryTimeout:              30 * time.Second,
				ServerTimeoutValue:        "00:00:30",
				EnforceTrustedEndpoints:   true,
				AllowUserTrustedEndpoints: true,
				UserTrustedEndpoints:      []string{"https://custom1.com", "https://custom2.com"},
			},
		},
		{
			name: "enforce trusted endpoints only",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{
					"clusterUrl": "https://test.kusto.windows.net"
				}`),
			},
			setupEnv: func() {
				err := os.Setenv("GF_PLUGIN_ENFORCE_TRUSTED_ENDPOINTS", "true")
				if err != nil {
					panic(err)
				}
				err = os.Setenv("GF_PLUGIN_ALLOW_USER_TRUSTED_ENDPOINTS", "false")
				if err != nil {
					panic(err)
				}
			},
			cleanupEnv: func() {
				err := os.Unsetenv("GF_PLUGIN_ENFORCE_TRUSTED_ENDPOINTS")
				if err != nil {
					panic(err)
				}
				err = os.Unsetenv("GF_PLUGIN_ALLOW_USER_TRUSTED_ENDPOINTS")
				if err != nil {
					panic(err)
				}
			},
			expectedResult: &DatasourceSettings{
				ClusterURL:                "https://test.kusto.windows.net",
				QueryTimeout:              30 * time.Second,
				ServerTimeoutValue:        "00:00:30",
				EnforceTrustedEndpoints:   true,
				AllowUserTrustedEndpoints: false,
				UserTrustedEndpoints:      nil,
			},
		},
		{
			name: "invalid environment variable for enforce trusted endpoints",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{}`),
			},
			setupEnv: func() {
				err := os.Setenv("GF_PLUGIN_ENFORCE_TRUSTED_ENDPOINTS", "invalid-bool")
				if err != nil {
					panic(err)
				}
			},
			cleanupEnv: func() {
				err := os.Unsetenv("GF_PLUGIN_ENFORCE_TRUSTED_ENDPOINTS")
				if err != nil {
					panic(err)
				}
			},
			expectedError: "invalid datasource endpoint configuration",
		},
		{
			name: "invalid environment variable for allow user trusted endpoints",
			config: backend.DataSourceInstanceSettings{
				JSONData: []byte(`{}`),
			},
			setupEnv: func() {
				err := os.Setenv("GF_PLUGIN_ENFORCE_TRUSTED_ENDPOINTS", "true")
				if err != nil {
					panic(err)
				}
				err = os.Setenv("GF_PLUGIN_ALLOW_USER_TRUSTED_ENDPOINTS", "invalid-bool")
				if err != nil {
					panic(err)
				}
			},
			cleanupEnv: func() {
				err := os.Unsetenv("GF_PLUGIN_ENFORCE_TRUSTED_ENDPOINTS")
				if err != nil {
					panic(err)
				}
				err = os.Unsetenv("GF_PLUGIN_ALLOW_USER_TRUSTED_ENDPOINTS")
				if err != nil {
					panic(err)
				}
			},
			expectedError: "invalid value for ALLOW_USER_TRUSTED_ENDPOINTS",
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			// Setup environment if needed
			if tt.setupEnv != nil {
				tt.setupEnv()
			}

			// Cleanup environment after test
			if tt.cleanupEnv != nil {
				defer tt.cleanupEnv()
			}

			ds := &DatasourceSettings{}
			err := ds.Load(tt.config)

			if tt.expectedError != "" {
				r.Error(err)
				r.Contains(err.Error(), tt.expectedError)
			} else {
				r.NoError(err)
				r.Equal(tt.expectedResult.ClusterURL, ds.ClusterURL)
				r.Equal(tt.expectedResult.DefaultDatabase, ds.DefaultDatabase)
				r.Equal(tt.expectedResult.DataConsistency, ds.DataConsistency)
				r.Equal(tt.expectedResult.CacheMaxAge, ds.CacheMaxAge)
				r.Equal(tt.expectedResult.DynamicCaching, ds.DynamicCaching)
				r.Equal(tt.expectedResult.EnableUserTracking, ds.EnableUserTracking)
				r.Equal(tt.expectedResult.Application, ds.Application)
				r.Equal(tt.expectedResult.QueryTimeoutRaw, ds.QueryTimeoutRaw)
				r.Equal(tt.expectedResult.QueryTimeout, ds.QueryTimeout)
				r.Equal(tt.expectedResult.ServerTimeoutValue, ds.ServerTimeoutValue)
				r.Equal(tt.expectedResult.EnforceTrustedEndpoints, ds.EnforceTrustedEndpoints)
				r.Equal(tt.expectedResult.AllowUserTrustedEndpoints, ds.AllowUserTrustedEndpoints)
				r.Equal(tt.expectedResult.UserTrustedEndpoints, ds.UserTrustedEndpoints)
			}
		})
	}
}

func (s *TestSettingsSuite) TestEnvBoolOrDefault() {
	r := s.Require()

	tests := []struct {
		name          string
		envKey        string
		envValue      string
		defaultValue  bool
		expectedValue bool
		expectedError string
	}{
		{
			name:          "environment variable not set",
			envKey:        "TEST_BOOL_UNSET",
			envValue:      "",
			defaultValue:  true,
			expectedValue: true,
		},
		{
			name:          "environment variable set to true",
			envKey:        "TEST_BOOL_TRUE",
			envValue:      "true",
			defaultValue:  false,
			expectedValue: true,
		},
		{
			name:          "environment variable set to false",
			envKey:        "TEST_BOOL_FALSE",
			envValue:      "false",
			defaultValue:  true,
			expectedValue: false,
		},
		{
			name:          "environment variable set to 1",
			envKey:        "TEST_BOOL_ONE",
			envValue:      "1",
			defaultValue:  false,
			expectedValue: true,
		},
		{
			name:          "environment variable set to 0",
			envKey:        "TEST_BOOL_ZERO",
			envValue:      "0",
			defaultValue:  true,
			expectedValue: false,
		},
		{
			name:          "invalid environment variable",
			envKey:        "TEST_BOOL_INVALID",
			envValue:      "invalid",
			defaultValue:  false,
			expectedError: "environment variable 'TEST_BOOL_INVALID' is invalid bool value 'invalid'",
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			// Set up environment variable
			if tt.envValue != "" {
				err := os.Setenv(tt.envKey, tt.envValue)
				if err != nil {
					panic(err)
				}
				defer func() {
					err := os.Unsetenv(tt.envKey)
					if err != nil {
						panic(err)
					}
				}()
			}

			result, err := envBoolOrDefault(tt.envKey, tt.defaultValue)

			if tt.expectedError != "" {
				r.Error(err)
				r.Contains(err.Error(), tt.expectedError)
			} else {
				r.NoError(err)
				r.Equal(tt.expectedValue, result)
			}
		})
	}
}

func (s *TestSettingsSuite) TestEnvStringSliceOrDefault() {
	r := s.Require()

	tests := []struct {
		name          string
		envKey        string
		envValue      string
		defaultValue  []string
		expectedValue []string
	}{
		{
			name:          "environment variable not set",
			envKey:        "TEST_SLICE_UNSET",
			envValue:      "",
			defaultValue:  []string{"default1", "default2"},
			expectedValue: []string{"default1", "default2"},
		},
		{
			name:          "environment variable set to single value",
			envKey:        "TEST_SLICE_SINGLE",
			envValue:      "value1",
			defaultValue:  []string{"default"},
			expectedValue: []string{"value1"},
		},
		{
			name:          "environment variable set to multiple values",
			envKey:        "TEST_SLICE_MULTIPLE",
			envValue:      "value1,value2,value3",
			defaultValue:  []string{"default"},
			expectedValue: []string{"value1", "value2", "value3"},
		},
		{
			name:          "environment variable set to empty string",
			envKey:        "TEST_SLICE_EMPTY",
			envValue:      "",
			defaultValue:  []string{"default"},
			expectedValue: []string{"default"},
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			// Set up environment variable
			if tt.envValue != "" {
				err := os.Setenv(tt.envKey, tt.envValue)
				if err != nil {
					panic(err)
				}
				defer func() {
					err := os.Unsetenv(tt.envKey)
					if err != nil {
						panic(err)
					}
				}()
			}

			result, err := envStringSliceOrDefault(tt.envKey, tt.defaultValue)

			r.NoError(err)
			r.Equal(tt.expectedValue, result)
		})
	}
}
