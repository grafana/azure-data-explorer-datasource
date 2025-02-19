package models

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/helpers"
)

// DatasourceSettings holds the datasource configuration information for Azure Data Explorer's API
// that is needed to execute a request against Azure's Data Explorer API.
type DatasourceSettings struct {
	ClusterURL         string `json:"clusterUrl"`
	DefaultDatabase    string `json:"defaultDatabase"`
	DataConsistency    string `json:"dataConsistency"`
	CacheMaxAge        string `json:"cacheMaxAge"`
	DynamicCaching     bool   `json:"dynamicCaching"`
	EnableUserTracking bool   `json:"enableUserTracking"`
	Application        string `json:"application"`

	// QueryTimeoutRaw is a duration string set in the datasource settings and corresponds
	// to the server execution timeout.
	QueryTimeoutRaw string `json:"queryTimeout"`

	// QueryTimeout the parsed duration of QueryTimeoutRaw.
	QueryTimeout time.Duration `json:"-"`

	// ServerTimeoutValue is the QueryTimeout formatted as a MS Timespan
	// which is used as a connection property option.
	ServerTimeoutValue string `json:"-"`
	OpenAIAPIKey       string

	EnforceTrustedEndpoints bool `json:"-"`
}

// newDataSourceData creates a dataSourceData from the plugin API's DatasourceInfo's
// JSONData and Encrypted JSONData which contains the information needed to connected to
// the datasource.
// It also sets the QueryTimeout and ServerTimeoutValues by parsing QueryTimeoutRaw.
func (d *DatasourceSettings) Load(config backend.DataSourceInstanceSettings) error {
	var err error
	if len(config.JSONData) > 1 {
		if err := json.Unmarshal(config.JSONData, d); err != nil {
			return fmt.Errorf("could not unmarshal DatasourceSettings json: %w", err)
		}
	}

	if d.ClusterURL != "" {
		sanitized, err := helpers.SanitizeClusterUri(d.ClusterURL)
		if err != nil {
			return fmt.Errorf("invalid datasource endpoint configuration: %w", err)
		}

		d.ClusterURL = sanitized
	}

	if d.QueryTimeoutRaw == "" {
		d.QueryTimeout = time.Second * 30
	} else {
		if d.QueryTimeout, err = time.ParseDuration(d.QueryTimeoutRaw); err != nil {
			return err
		}
	}

	if d.ServerTimeoutValue, err = formatTimeout(d.QueryTimeout); err != nil {
		return err
	}

	d.EnforceTrustedEndpoints, err = envBoolOrDefault("GF_PLUGIN_ENFORCE_TRUSTED_ENDPOINTS", false)
	if err != nil {
		return fmt.Errorf("invalid datasource endpoint configuration: %w", err)
	}

	return nil
}

// formatTimeout creates some sort of MS TimeSpan string for durations
// that up to an hour. It is used for the servertimeout request property
// option.
// https://docs.microsoft.com/en-us/azure/data-explorer/kusto/concepts/querylimits#limit-execution-timeout
func formatTimeout(d time.Duration) (string, error) {
	if d > time.Hour {
		return "", fmt.Errorf("timeout must be one hour or less")
	}

	return fmt.Sprintf("%02d:%02d:%02d", int(d.Hours()), int(d.Minutes())%60, int(d.Seconds())%60), nil
}

func envBoolOrDefault(key string, defaultValue bool) (bool, error) {
	if strValue := os.Getenv(key); strValue == "" {
		return defaultValue, nil
	} else if value, err := strconv.ParseBool(strValue); err != nil {
		return false, fmt.Errorf("environment variable '%s' is invalid bool value '%s'", key, strValue)
	} else {
		return value, nil
	}
}
