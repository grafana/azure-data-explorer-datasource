import { AzureCredentials, getClientSecret, getDatasourceCredentials, getDefaultAzureCloud, updateDatasourceCredentials, resolveLegacyCloudName } from '@grafana/azure-sdk';
import { DataSourceSettings } from '@grafana/data';
import { config } from '@grafana/runtime';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, AdxDataSourceSettings } from 'types';

export const getOboEnabled = (): boolean => !!config.featureToggles['adxOnBehalfOf'];

export function hasCredentials(options: DataSourceSettings<AdxDataSourceOptions, AdxDataSourceSecureOptions>): boolean {
  return (
    typeof options.jsonData.azureCredentials === 'object' ||
    (typeof options.jsonData.tenantId === 'string' && typeof options.jsonData.clientId === 'string')
  );
}

export function getDefaultCredentials(): AzureCredentials {
  if (config.azure.userIdentityEnabled && config.featureToggles['adxUserIdentityPreferred']) {
    return { authType: 'currentuser' };
  } else if (config.azure.managedIdentityEnabled) {
    return { authType: 'msi' };
  } else if (config.azure.workloadIdentityEnabled) {
    return { authType: 'workloadidentity' };
  } else if (config.azure.userIdentityEnabled) {
    return { authType: 'currentuser' };
  } else {
    return { authType: 'clientsecret', azureCloud: getDefaultAzureCloud() };
  }
}

export function getCredentials(options: AdxDataSourceSettings): AzureCredentials {
  const credentials = getDatasourceCredentials(options, getOboEnabled());
  if (credentials)
  {
    return credentials;
  }

  // If no credentials saved then try to restore legacy credentials, otherwise return default credentials
  return getLegacyCredentials(options) ?? getDefaultCredentials();
}

function getLegacyCredentials(options: AdxDataSourceSettings): AzureCredentials | undefined {
  const jsonData = options.jsonData;

  if (typeof jsonData.tenantId === 'string' || typeof jsonData.clientId === 'string') {
    try {
      return {
        authType: jsonData.onBehalfOf ? 'clientsecret-obo' : 'clientsecret',
        azureCloud: resolveLegacyCloudName(jsonData.azureCloud) || getDefaultAzureCloud(),
        tenantId: typeof jsonData.tenantId === 'string' ? jsonData.tenantId : '',
        clientId: typeof jsonData.clientId === 'string' ? jsonData.clientId : '',
        clientSecret: getClientSecret(options),
      };
    } catch (e) {
      if (e instanceof Error) {
        console.error('Unable to restore legacy credentials: %s', e.message);
      }
      return undefined;
    }
  }

  return undefined;
}

export function updateCredentials(
  options: AdxDataSourceSettings,
  credentials: AzureCredentials
): AdxDataSourceSettings {
  return updateDatasourceCredentials(options, credentials, getOboEnabled()) as AdxDataSourceSettings;
}
