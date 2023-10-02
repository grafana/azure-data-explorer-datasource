import { DataSourceSettings, SelectableValue } from '@grafana/data';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import { getCredentials } from './AzureCredentialsConfig';

export enum AzureCloud {
  Public = 'AzureCloud',
  China = 'AzureChinaCloud',
  USGovernment = 'AzureUSGovernment',
}

export const KnownAzureClouds = [
  { value: AzureCloud.Public, label: 'Azure' },
  { value: AzureCloud.China, label: 'Azure China' },
  { value: AzureCloud.USGovernment, label: 'Azure US Government' },
] as SelectableValue[];

export type AzureAuthType = 'currentuser' | 'msi' | 'clientsecret' | 'clientsecret-obo' | 'workloadidentity';

export type ConcealedSecret = symbol;

interface AzureCredentialsBase {
  authType: AzureAuthType;
}

interface AadCurrentUserCredentials extends AzureCredentialsBase {
  authType: 'currentuser';
}

export interface AzureManagedIdentityCredentials extends AzureCredentialsBase {
  authType: 'msi';
}

export interface AzureWorkloadIdentityCredentials extends AzureCredentialsBase {
  authType: 'workloadidentity';
}

export interface AzureClientSecretCredentials extends AzureCredentialsBase {
  authType: 'clientsecret';
  azureCloud?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string | ConcealedSecret;
}

interface AzureClientSecretOboCredentials extends AzureCredentialsBase {
  authType: 'clientsecret-obo';
  azureCloud?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string | ConcealedSecret;
}

export type AzureCredentials =
  | AadCurrentUserCredentials
  | AzureManagedIdentityCredentials
  | AzureClientSecretCredentials
  | AzureClientSecretOboCredentials
  | AzureWorkloadIdentityCredentials;

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
