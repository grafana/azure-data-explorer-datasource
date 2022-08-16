package models

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// DatasourceSettings holds the datasource configuration information for Azure Data Explorer's API
// that is needed to execute a request against Azure's Data Explorer API.
type DatasourceSettings struct {
	ClientID           string `json:"clientId"`
	TenantID           string `json:"tenantId"`
	ClusterURL         string `json:"clusterUrl"`
	DefaultDatabase    string `json:"defaultDatabase"`
	Secret             string `json:"-"`
	DataConsistency    string `json:"dataConsistency"`
	CacheMaxAge        string `json:"cacheMaxAge"`
	DynamicCaching     bool   `json:"dynamicCaching"`
	EnableUserTracking bool   `json:"enableUserTracking"`
	OnBehalfOf         bool   `json:"onBehalfOf"`
	OAuthPassThru      bool   `json:"oauthPassThru"`
	AzureCloud         string `json:"azureCloud"`

	// QueryTimeoutRaw is a duration string set in the datasource settings and corresponds
	// to the server execution timeout.
	QueryTimeoutRaw string `json:"queryTimeout"`

	// QueryTimeout the parsed duration of QueryTimeoutRaw.
	QueryTimeout time.Duration `json:"-"`

	// ServerTimeoutValue is the QueryTimeout formatted as a MS Timespan
	// which is used as a connection property option.
	ServerTimeoutValue string `json:"-"`
}

// newDataSourceData creates a dataSourceData from the plugin API's DatasourceInfo's
// JSONData and Encrypted JSONData which contains the information needed to connected to
// the datasource.
// It also sets the QueryTimeout and ServerTimeoutValues by parsing QueryTimeoutRaw.
func (d *DatasourceSettings) Load(config backend.DataSourceInstanceSettings) error {
	var err error
	var jsonData map[string]interface{}
	if config.JSONData != nil && len(config.JSONData) > 1 {
		if err := json.Unmarshal(config.JSONData, &jsonData); err != nil {
			return fmt.Errorf("could not unmarshal DatasourceSettings json: %w", err)
		}
	}

	if jsonData["clientId"] != nil {
		d.ClientID = jsonData["clientId"].(string)
	}
	if jsonData["tenantId"] != nil {
		d.TenantID = jsonData["tenantId"].(string)
	}
	if jsonData["clusterUrl"] != nil {
		d.ClusterURL = jsonData["clusterUrl"].(string)
	}
	if jsonData["defaultDatabase"] != nil {
		d.DefaultDatabase = jsonData["defaultDatabase"].(string)
	}
	if jsonData["dataConsistency"] != nil {
		d.DataConsistency = jsonData["dataConsistency"].(string)
	}
	if jsonData["cacheMaxAge"] != nil {
		d.CacheMaxAge = jsonData["cacheMaxAge"].(string)
	}
	if jsonData["dynamicCaching"] != nil {
		if dynamicCaching, ok := jsonData["dynamicCaching"].(string); ok {
			d.DynamicCaching, err = strconv.ParseBool(dynamicCaching)
			if err != nil {
				return fmt.Errorf("could not parse dynamicCaching value: %w", err)
			}
		} else {
			d.DynamicCaching = jsonData["dynamicCaching"].(bool)
		}
	}
	if jsonData["enableUserTracking"] != nil {
		if enableUserTracking, ok := jsonData["enableUserTracking"].(string); ok {
			d.EnableUserTracking, err = strconv.ParseBool(enableUserTracking)
			if err != nil {
				return fmt.Errorf("could not parse enableUserTracking value: %w", err)
			}
		} else {
			d.EnableUserTracking = jsonData["enableUserTracking"].(bool)
		}
	}
	if jsonData["onBehalfOf"] != nil {
		if onBehalfOf, ok := jsonData["onBehalfOf"].(string); ok {
			d.OnBehalfOf, err = strconv.ParseBool(onBehalfOf)
			if err != nil {
				return fmt.Errorf("could not parse onBehalfOf value: %w", err)
			}
		} else {
			d.OnBehalfOf = jsonData["onBehalfOf"].(bool)
		}
	}
	if jsonData["oauthPassThru"] != nil {
		if oauthPassThru, ok := jsonData["oauthPassThru"].(string); ok {
			d.OAuthPassThru, err = strconv.ParseBool(oauthPassThru)
			if err != nil {
				return fmt.Errorf("could not parse OAuthPassThru value: %w", err)
			}
		} else {
			d.OAuthPassThru = jsonData["oauthPassThru"].(bool)
		}
	}
	if jsonData["azureCloud"] != nil {
		d.AzureCloud = jsonData["azureCloud"].(string)
	}
	if jsonData["queryTimeout"] != nil {
		d.QueryTimeoutRaw = jsonData["queryTimeout"].(string)
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

	d.Secret = config.DecryptedSecureJSONData["clientSecret"]

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
	if d == time.Hour {
		return "01:00:00", nil
	}
	if d < time.Minute {
		return fmt.Sprintf("00:00:%02.0f", d.Seconds()), nil
	}
	tMinutes := d.Truncate(time.Minute)

	tSeconds := d - tMinutes
	return fmt.Sprintf("00:%02.0f:%02.0f)", tMinutes.Minutes(), tSeconds.Seconds()), nil
}
