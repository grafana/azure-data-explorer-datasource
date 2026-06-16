import { DataSourcePluginOptionsEditorProps, PluginType } from '@grafana/data';

import { AdxDataSource } from '../../datasource';
import { QueryEditorExpressionType } from '../../types/expressions';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, AdxQueryType, EditorMode, KustoQuery } from '../../types';

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
    user: '',
    basicAuth: false,
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
      clusterUrl: 'clusterUrl',
      application: ''
    },
    secureJsonFields: {},
    readOnly: false,
    withCredentials: false,
  },
  onOptionsChange: jest.fn(),
};

export const mockDatasource = (overrides?: Partial<{ [Property in keyof AdxDataSource]: AdxDataSource[Property] }>) => {
  const ds = new AdxDataSource({
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
    readOnly: false,
  });
  ds.getResource = jest.fn().mockResolvedValue([]);
  if (overrides) {
    for (const key of Object.keys(overrides)) {
      ds[key] = overrides[key];
    }
  }
  return ds;
};

export const mockQuery: KustoQuery = {
  refId: 'A',
  query: '',
  database: '',
  resultFormat: '',
  clusterUri: '',
  expression: {
    where: { expressions: [], type: QueryEditorExpressionType.And },
    reduce: { expressions: [], type: QueryEditorExpressionType.And },
    groupBy: { expressions: [], type: QueryEditorExpressionType.And },
  },
  querySource: 'raw',
  pluginVersion: '1',
  queryType: AdxQueryType.KustoQuery,
};
