package client

import (
	"fmt"

	"github.com/grafana/grafana-azure-sdk-go/v2/azsettings"
)

/*
Taken from:
https://github.com/Azure/azure-kusto-go/blob/master/kusto/trustedendpoints/well_known_kusto_endpoints.json
*/
var azureDataExplorerEndpoints = map[string][]string{
	azsettings.AzurePublic: {
		"https://ade.applicationinsights.io",
		"https://ade.loganalytics.io",
		"https://adx.aimon.applicationinsights.azure.com",
		"https://adx.applicationinsights.azure.com",
		"https://adx.int.applicationinsights.azure.com",
		"https://adx.int.loganalytics.azure.com",
		"https://adx.int.monitor.azure.com",
		"https://adx.loganalytics.azure.com",
		"https://adx.monitor.azure.com",
		"https://kusto.aria.microsoft.com",
		"https://eu.kusto.aria.microsoft.com",
		"https://*.dxp.aad.azure.com",
		"https://*.dxp-dev.aad.azure.com",
		"https://*.kusto.azuresynapse.net",
		"https://*.kusto.windows.net",
		"https://*.kustodev.azuresynapse-dogfood.net",
		"https://*.kustodev.windows.net",
		"https://*.kustomfa.windows.net",
		"https://*.playfabapi.com",
		"https://*.playfab.com",
		"https://*.kusto.data.microsoft.com",
		"https://*.kusto.fabric.microsoft.com",
	},
	azsettings.AzureUSGovernment: {
		"https://adx.applicationinsights.azure.us",
		"https://adx.loganalytics.azure.us",
		"https://adx.monitor.azure.us",
		"https://*.kusto.usgovcloudapi.net",
		"https://*.kustomfa.usgovcloudapi.net",
	},
	azsettings.AzureChina: {
		"https://adx.applicationinsights.azure.cn",
		"https://adx.loganalytics.azure.cn",
		"https://adx.monitor.azure.cn",
		"https://*.kusto.azuresynapse.azure.cn",
		"https://*.kusto.chinacloudapi.cn",
		"https://*.kustomfa.chinacloudapi.cn",
		"https://*.playfab.cn",
	},
}

func getAdxEndpoints(azureCloud string) ([]string, error) {
	if endpoints, ok := azureDataExplorerEndpoints[azureCloud]; !ok {
		return nil, fmt.Errorf("the Azure cloud '%s' not supported by Azure Data Explorer datasource", azureCloud)
	} else {
		return endpoints, nil
	}
}
