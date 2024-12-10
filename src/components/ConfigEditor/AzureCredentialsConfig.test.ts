import { AzureCredentials, AzureClientSecretCredentials } from '@grafana/azure-sdk';
import { DataSourceSettings, KeyValue } from '@grafana/data';
import { hasCredentials, getCredentials, updateCredentials } from './AzureCredentialsConfig';

function dsOptions(
  jsonData: KeyValue,
  secureJsonData: KeyValue<string>,
  secureJsonFields: KeyValue<boolean>
): DataSourceSettings<any, any> {
  return {
    id: 123,
    uid: 'n_ab1cdV5',
    orgId: 1,
    type: 'grafana-azure-data-explorer-datasource',
    name: 'Azure Data Explorer Datasource',
    access: 'proxy',
    basicAuth: false,
    basicAuthUser: '',
    database: '',
    isDefault: false,
    jsonData: jsonData,
    secureJsonData: secureJsonData,
    secureJsonFields: secureJsonFields,
    readOnly: false,
    typeLogoUrl: '',
    typeName: '',
    url: '',
    user: '',
    withCredentials: false,
  };
}

describe('hasCredentials', () => {
  it('should return false if no credentials set', () => {
    const options = dsOptions(
      {
        clusterUrl: 'https://test123.net',
        dataConsistency: 'strongconsistency',
        defaultEditorMode: 'visual',
      },
      {},
      {}
    );

    const result = hasCredentials(options);

    expect(result).toEqual(false);
  });

  it('should return true if credentials object is present', () => {
    const options = dsOptions(
      {
        clusterUrl: 'https://test123.net',
        azureCredentials: {
          authType: 'clientsecret',
          azureCloud: 'AzureCloud',
          clientId: '123',
          tenantId: '123',
        },
        dataConsistency: 'strongconsistency',
        defaultEditorMode: 'visual',
      },
      {
        azureClientSecret: '123',
      },
      {
        azureClientSecret: true,
      }
    );

    const result = hasCredentials(options);

    expect(result).toEqual(true);
  });

  it('should return true if legacy credentials are present', () => {
    const options = dsOptions(
      {
        clusterUrl: 'https://test123.net',
        azureCloud: 'azuremonitor',
        clientId: '123',
        tenantId: '123',
        dataConsistency: 'strongconsistency',
        defaultEditorMode: 'visual',
      },
      {
        clientSecret: '123',
      },
      {
        clientSecret: true,
      }
    );

    const result = hasCredentials(options);

    expect(result).toEqual(true);
  });
});

describe('updateCredentials', () => {
  describe('client secret', () => {
    it('should set azureClientSecret when saving new azureCredentials', () => {
      const options = dsOptions(
        {
          clusterUrl: 'https://test123.net',
        },
        {},
        {}
      );

      // New credentials
      const credentials: AzureCredentials = {
        authType: 'clientsecret',
        tenantId: 'fake-tenant-id',
        clientId: 'fake-client-id',
        clientSecret: 'fake-secret',
      };

      const updatedOptions = updateCredentials(options, credentials);

      expect(updatedOptions.secureJsonData).toBeDefined();
      expect(updatedOptions.secureJsonData!['azureClientSecret']).toEqual('fake-secret');
      expect(updatedOptions.secureJsonFields['azureClientSecret']).toBeFalsy();
      expect(updatedOptions.secureJsonFields['clientSecret']).toBeFalsy();
    });

    describe('given updating credentials in common format', () => {
      const options = dsOptions(
        {
          clusterUrl: 'https://test123.net',
          azureCredentials: {
            authType: 'clientsecret',
            azureCloud: 'AzureCloud',
            tenantId: 'fake-tenant-id',
            clientId: 'fake-client-id',
          },
        },
        {},
        {
          azureClientSecret: true,
        }
      );

      it('should keep clientSecret field set when secret was not updated', () => {
        const credentials = getCredentials(options) as AzureClientSecretCredentials;

        // Update credentials without updating existing secret
        credentials.clientId = 'new-fake-client-id';

        const updatedOptions = updateCredentials(options, credentials);

        expect(updatedOptions.secureJsonData).toBeDefined();
        expect(updatedOptions.secureJsonData!['azureClientSecret']).toBeUndefined();
        expect(updatedOptions.secureJsonFields['azureClientSecret']).toBeTruthy();
        expect(updatedOptions.secureJsonFields['clientSecret']).toBeFalsy();
      });

      it('should set azureClientSecret value when secret was updated', () => {
        const credentials = getCredentials(options) as AzureClientSecretCredentials;

        // Update existing secret
        credentials.clientSecret = 'new-fake-secret';

        const updatedOptions = updateCredentials(options, credentials);

        expect(updatedOptions.secureJsonData).toBeDefined();
        expect(updatedOptions.secureJsonData!['azureClientSecret']).toEqual('new-fake-secret');
        expect(updatedOptions.secureJsonFields['azureClientSecret']).toBeFalsy();
        expect(updatedOptions.secureJsonFields['clientSecret']).toBeFalsy();
      });
    });

    describe('given migrating from legacy credentials', () => {
      const options = dsOptions(
        {
          clusterUrl: 'https://test123.net',
          azureCloud: 'azuremonitor',
          tenantId: 'fake-tenant-id',
          clientId: 'fake-client-id',
        },
        {},
        {
          clientSecret: true,
        }
      );

      it('should set clientSecret field when secret was not updated', () => {
        const credentials = getCredentials(options) as AzureClientSecretCredentials;

        // Update credentials without updating existing secret
        credentials!.clientId = 'new-fake-client-id';

        const updatedOptions = updateCredentials(options, credentials!);

        expect(updatedOptions.secureJsonData).toBeDefined();
        expect(updatedOptions.secureJsonData!['azureClientSecret']).toBeUndefined();
        expect(updatedOptions.secureJsonFields['azureClientSecret']).toBeFalsy();
        expect(updatedOptions.secureJsonFields['clientSecret']).toBeTruthy();
      });

      it('should set azureClientSecret value when secret was updated', () => {
        const credentials = getCredentials(options) as AzureClientSecretCredentials;

        // Update existing secret
        credentials!.clientSecret = 'new-fake-secret';

        const updatedOptions = updateCredentials(options, credentials!);

        expect(updatedOptions.secureJsonData).toBeDefined();
        expect(updatedOptions.secureJsonData!['azureClientSecret']).toEqual('new-fake-secret');
        expect(updatedOptions.secureJsonFields['azureClientSecret']).toBeFalsy();
        expect(updatedOptions.secureJsonFields['clientSecret']).toBeFalsy();
      });
    });
  });
});
