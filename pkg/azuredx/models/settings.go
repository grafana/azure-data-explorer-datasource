package models

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"

	"github.com/grafana/azure-data-explorer-datasource/pkg/azuredx/helpers"
)

// AzureCredentials mirrors the nested jsonData.azureCredentials object that the
// shared grafana-azure-sdk-go parses to build the datasource credentials.
type AzureCredentials struct {
	AuthType   LenientString `json:"authType"`
	AzureCloud LenientString `json:"azureCloud"`
	TenantID   LenientString `json:"tenantId"`
	ClientID   LenientString `json:"clientId"`
}

// SchemaMapping mirrors an entry in jsonData.schemaMappings, the managed schema
// list written by the frontend config editor when useSchemaMapping is enabled.
type SchemaMapping struct {
	Type        LenientString `json:"type"`
	Value       LenientString `json:"value"`
	Name        LenientString `json:"name"`
	Database    LenientString `json:"database"`
	DisplayName LenientString `json:"displayName"`
}

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

	// The fields below are not read by this backend; they exist so the jsonData
	// model stays in sync with pkg/schema/dsconfig.json. They use the lenient
	// types from lenient.go so a loosely typed provisioned value cannot fail the
	// unmarshal and take the datasource down.
	MinimalCache      LenientInt            `json:"minimalCache"`
	DefaultEditorMode LenientString         `json:"defaultEditorMode"`
	UseSchemaMapping  LenientBool           `json:"useSchemaMapping"`
	SchemaMappings    LenientSchemaMappings `json:"schemaMappings"`
	KeepCookies       LenientStringSlice    `json:"keepCookies"`
	AzureCredentials  AzureCredentials      `json:"azureCredentials"`

	// EnableSecureSocksProxy is consumed by Grafana core rather than this plugin;
	// it is declared here so the jsonData model stays in sync with the schema.
	EnableSecureSocksProxy LenientBool `json:"enableSecureSocksProxy"`

	// Legacy top-level credential fields, preserved so datasources provisioned
	// before the migration to jsonData.azureCredentials continue to parse.
	// adxcredentials reads these from the raw jsonData map, not from here.
	AzureCloud    LenientString `json:"azureCloud"`
	TenantID      LenientString `json:"tenantId"`
	ClientID      LenientString `json:"clientId"`
	OnBehalfOf    LenientBool   `json:"onBehalfOf"`
	OAuthPassThru LenientBool   `json:"oauthPassThru"`

	// QueryTimeoutRaw is a duration string set in the datasource settings and corresponds
	// to the server execution timeout.
	QueryTimeoutRaw string `json:"queryTimeout"`

	// QueryTimeout the parsed duration of QueryTimeoutRaw.
	QueryTimeout time.Duration `json:"-"`

	// ServerTimeoutValue is the QueryTimeout formatted as a MS Timespan
	// which is used as a connection property option.
	ServerTimeoutValue string `json:"-"`
	OpenAIAPIKey       string

	EnforceTrustedEndpoints   bool     `json:"-"`
	AllowUserTrustedEndpoints bool     `json:"-"`
	UserTrustedEndpoints      []string `json:"-"`
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

	d.AllowUserTrustedEndpoints, err = envBoolOrDefault("GF_PLUGIN_ALLOW_USER_TRUSTED_ENDPOINTS", false)
	if err != nil {
		return fmt.Errorf("invalid value for ALLOW_USER_TRUSTED_ENDPOINTS: %w", err)
	}

	if d.EnforceTrustedEndpoints && d.AllowUserTrustedEndpoints {
		d.UserTrustedEndpoints, err = envStringSliceOrDefault("GF_PLUGIN_USER_TRUSTED_ENDPOINTS", []string{})
		if err != nil {
			return fmt.Errorf("invalid value for USER_TRUSTED_ENDPOINTS: %w", err)
		}
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

func envStringSliceOrDefault(key string, defaultValue []string) ([]string, error) {
	strValue := os.Getenv(key)
	if strValue == "" {
		return defaultValue, nil
	}
	return strings.Split(strValue, ","), nil
}
