import { DataSourceSettings, KeyValue } from '@grafana/data';
import { hasCredentials } from './AzureCredentialsConfig';

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
