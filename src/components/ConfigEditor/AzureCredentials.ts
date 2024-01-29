import { DataSourceSettings } from '@grafana/data';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import { getCredentials } from './AzureCredentialsConfig';

export enum AzureCloud {
  Public = 'AzureCloud',
  China = 'AzureChinaCloud',
  USGovernment = 'AzureUSGovernment',
}

export function isCredentialsComplete(
  options: DataSourceSettings<AdxDataSourceOptions, AdxDataSourceSecureOptions>
): boolean {
  const credentials = options.jsonData.azureCredentials ? options.jsonData.azureCredentials : getCredentials(options);
  switch (credentials.authType) {
    case 'currentuser':
    case 'msi':
    case 'workloadidentity':
      return true;
    case 'clientsecret':
    case 'clientsecret-obo':
      return !!(credentials.azureCloud && credentials.tenantId && credentials.clientId && credentials.clientSecret);
  }
}
