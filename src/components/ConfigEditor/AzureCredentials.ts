import { SelectableValue } from '@grafana/data';

export enum AzureCloud {
  Public = 'AzureCloud',
  China = 'AzureChinaCloud',
  USGovernment = 'AzureUSGovernment',
  None = '',
}

export const KnownAzureClouds = [
  { value: AzureCloud.Public, label: 'Azure' },
  { value: AzureCloud.China, label: 'Azure China' },
  { value: AzureCloud.USGovernment, label: 'Azure US Government' },
] as SelectableValue[];

export type AzureAuthType = 'msi' | 'clientsecret' | 'clientsecret-obo';

export type ConcealedSecret = symbol;

interface AzureCredentialsBase {
  authType: AzureAuthType;
}

export interface AzureManagedIdentityCredentials extends AzureCredentialsBase {
  authType: 'msi';
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
  | AzureManagedIdentityCredentials
  | AzureClientSecretCredentials
  | AzureClientSecretOboCredentials;

export function isCredentialsComplete(credentials: AzureCredentials): boolean {
  switch (credentials.authType) {
    case 'msi':
      return true;
    case 'clientsecret':
    case 'clientsecret-obo':
      return !!(credentials.azureCloud && credentials.tenantId && credentials.clientId && credentials.clientSecret);
  }
}
