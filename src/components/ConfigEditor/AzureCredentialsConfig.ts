import { DataSourceSettings } from '@grafana/data';
import { config } from '@grafana/runtime';

import { AzureCloud, AzureCredentials, ConcealedSecret } from './AzureCredentials';

const concealed: ConcealedSecret = Symbol('Concealed client secret');
const concealedLegacy: ConcealedSecret = Symbol('Concealed legacy client secret');

export const getOboEnabled = (): boolean => !!config.featureToggles['adxOnBehalfOf'];

function getDefaultAzureCloud(): string {
  return config.azure.cloud || AzureCloud.Public;
}

function getSecret(options: DataSourceSettings<any, any>): undefined | string | ConcealedSecret {
  if (options.secureJsonFields.azureClientSecret) {
    // The secret is concealed on server
    return concealed;
  } else if (options.secureJsonFields.clientSecret) {
    // A legacy secret field was preserved during migration
    return concealedLegacy;
  } else {
    const secret = options.secureJsonData?.azureClientSecret;
    return typeof secret === 'string' && secret.length > 0 ? secret : undefined;
  }
}

export function hasCredentials(options: DataSourceSettings<any, any>): boolean {
  return (
    typeof options.jsonData.azureCredentials === 'object' ||
    (typeof options.jsonData.tenantId === 'string' && typeof options.jsonData.clientId === 'string')
  );
}

export function getDefaultCredentials(): AzureCredentials {
  if (config.azure.managedIdentityEnabled) {
    return { authType: 'msi' };
  } else {
    return { authType: 'clientsecret', azureCloud: getDefaultAzureCloud() };
  }
}

export function getCredentials(options: DataSourceSettings<any, any>): AzureCredentials {
  const credentials = options.jsonData.azureCredentials as AzureCredentials | undefined;

  // If no credentials saved then try to restore legacy credentials, otherwise return default credentials
  if (!credentials) {
    return getLegacyCredentials(options) ?? getDefaultCredentials();
  }

  switch (credentials.authType) {
    case 'msi':
      if (config.azure.managedIdentityEnabled) {
        return {
          authType: 'msi',
        };
      } else {
        // If authentication type is managed identity but managed identities were disabled in Grafana config,
        // then we should fall back to an empty default credentials
        return getDefaultCredentials();
      }
    case 'clientsecret':
    case 'clientsecret-obo':
      if (credentials.authType === 'clientsecret-obo' && !getOboEnabled()) {
        // If authentication type is OBO but OBO were disabled in Grafana config,
        // then we should fall back to an empty default credentials
        return getDefaultCredentials();
      }
      return {
        authType: credentials.authType,
        azureCloud: credentials.azureCloud || getDefaultAzureCloud(),
        tenantId: credentials.tenantId,
        clientId: credentials.clientId,
        clientSecret: getSecret(options),
      };
  }
}

function getLegacyCredentials(options: DataSourceSettings<any, any>): AzureCredentials | undefined {
  const jsonData = options.jsonData;

  if (typeof jsonData.tenantId === 'string' || typeof jsonData.clientId === 'string') {
    try {
      const azureCloud = resolveLegacyCloudName(jsonData.azureCloud);

      return {
        authType: jsonData.onBehalfOf ? 'clientsecret-obo' : 'clientsecret',
        azureCloud: azureCloud,
        tenantId: typeof jsonData.tenantId === 'string' ? jsonData.tenantId : '',
        clientId: typeof jsonData.clientId === 'string' ? jsonData.clientId : '',
        clientSecret: options.secureJsonFields.clientSecret ? concealedLegacy : undefined,
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

function resolveLegacyCloudName(cloudName: string): AzureCloud {
  if (!cloudName) {
    return AzureCloud.Public;
  }

  switch (cloudName) {
    case 'azuremonitor':
      return AzureCloud.Public;
    case 'chinaazuremonitor':
      return AzureCloud.China;
    case 'govazuremonitor':
      return AzureCloud.USGovernment;
    default:
      throw new Error(`Azure cloud '${cloudName}' not supported by Azure Data Explorer datasource.`);
  }
}

export function updateCredentials(
  options: DataSourceSettings<any, any>,
  credentials: AzureCredentials
): DataSourceSettings<any, any> {
  // Cleanup legacy credentials
  options = {
    ...options,
    jsonData: {
      ...options.jsonData,
      azureCloud: undefined,
      tenantId: undefined,
      clientId: undefined,
      onBehalfOf: undefined,
    },
  };

  // Apply updated credentials
  switch (credentials.authType) {
    case 'msi':
      if (!config.azure.managedIdentityEnabled) {
        throw new Error('Managed Identity authentication is not enabled in Grafana config.');
      }
      options = {
        ...options,
        jsonData: {
          ...options.jsonData,
          azureCredentials: {
            authType: 'msi',
          },
        },
      };
      break;

    case 'clientsecret':
    case 'clientsecret-obo':
      options = {
        ...options,
        jsonData: {
          ...options.jsonData,
          azureCredentials: {
            authType: credentials.authType,
            azureCloud: credentials.azureCloud || getDefaultAzureCloud(),
            tenantId: credentials.tenantId,
            clientId: credentials.clientId,
          },
        },
        secureJsonData: {
          ...options.secureJsonData,
          azureClientSecret:
            typeof credentials.clientSecret === 'string' && credentials.clientSecret.length > 0
              ? credentials.clientSecret
              : undefined,
        },
        secureJsonFields: {
          ...options.secureJsonFields,
          azureClientSecret: credentials.clientSecret === concealed,
          clientSecret: credentials.clientSecret === concealedLegacy,
        },
      };
      break;
  }

  // User identity based auth requires oauthPassThru to have access to the user's ID token
  switch (credentials.authType) {
    case 'clientsecret-obo':
      options = {
        ...options,
        jsonData: {
          ...options.jsonData,
          oauthPassThru: true,
        },
      };
      break;

    default:
      options = {
        ...options,
        jsonData: {
          ...options.jsonData,
          oauthPassThru: undefined,
        },
      };
      break;
  }

  return options;
}
