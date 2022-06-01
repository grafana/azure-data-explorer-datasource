import { DataSourcePluginOptionsEditorProps, PluginType } from '@grafana/data';

import { AdxDataSource } from '../../datasource';
import { QueryEditorExpressionType } from '../../editor/expressions';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, EditorMode, KustoQuery } from '../../types';

export const mockDatasourceOptions: DataSourcePluginOptionsEditorProps<
  AdxDataSourceOptions,
  AdxDataSourceSecureOptions
> = {
  options: {
    id: 1,
    uid: 'adx-id',
    orgId: 1,
    name: 'ADX Data source',
    typeLogoUrl: '',
    type: '',
    typeName: '',
    access: '',
    url: '',
    password: '',
    user: '',
    basicAuth: false,
    basicAuthPassword: '',
    basicAuthUser: '',
    database: '',
    isDefault: false,
    jsonData: {
      defaultDatabase: 'default',
      minimalCache: 1,
      defaultEditorMode: EditorMode.Raw,
      queryTimeout: '',
      dataConsistency: '',
      cacheMaxAge: '',
      dynamicCaching: false,
      useSchemaMapping: false,
      enableUserTracking: false,
      clusterUrl: '',
      tenantId: '',
      clientId: '',
      onBehalfOf: false,
      oauthPassThru: false,
    },
    secureJsonFields: {},
    readOnly: false,
    withCredentials: false,
  },
  onOptionsChange: jest.fn(),
};

export const mockDatasource = () =>
  new AdxDataSource({
    id: 1,
    uid: 'adx-id',
    type: 'adx-datasource',
    name: 'ADX Data Source',
    access: 'proxy',
    jsonData: mockDatasourceOptions.options.jsonData,
    meta: {
      id: 'adx-datasource',
      name: 'ADX Data Source',
      type: PluginType.datasource,
      module: '',
      baseUrl: '',
      info: {
        description: '',
        screenshots: [],
        updated: '',
        version: '',
        logos: {
          small: '',
          large: '',
        },
        author: {
          name: '',
        },
        links: [],
      },
    },
  });

export const mockQuery: KustoQuery = {
  refId: 'A',
  query: '',
  database: '',
  resultFormat: '',
  expression: {
    where: { expressions: [], type: QueryEditorExpressionType.And },
    reduce: { expressions: [], type: QueryEditorExpressionType.And },
    groupBy: { expressions: [], type: QueryEditorExpressionType.And },
  },
  querySource: 'raw',
  pluginVersion: '',
};
