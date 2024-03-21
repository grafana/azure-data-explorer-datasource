import { CoreApp, DataQueryRequest, getDefaultTimeRange, toDataFrame } from '@grafana/data';
import { lastValueFrom, of } from 'rxjs';
import { mockDatasource } from 'components/__fixtures__/Datasource';
import { AdxQueryType, KustoQuery, defaultQuery } from 'types';
import { VariableSupport } from 'variables';

jest.mock('@grafana/runtime', () => {
  const original = jest.requireActual('@grafana/runtime');
  return {
    ...original,
    getTemplateSrv: () => ({
      getVariables: () => [],
      replace: (s: string) => s,
    }),
  };
});

const mockRequest = (overrides?: Partial<DataQueryRequest<KustoQuery>>): DataQueryRequest<KustoQuery> => {
  const range = getDefaultTimeRange();
  return {
    requestId: 'test-request',
    interval: '10000',
    intervalMs: 10000,
    range,
    scopedVars: {},
    targets: [],
    timezone: 'UTC',
    app: CoreApp.Dashboard,
    startTime: 0,
    ...overrides,
  };
};

const mockSchema = {
  Databases: {
    test_db: {
      Name: 'test_db',
      Tables: {
        test_table: {
          Name: 'test_table',
          OrderedColumns: [
            {
              Name: 'test_column',
              Type: 'System.Int64',
              CslType: 'long',
            },
            {
              Name: 'time',
              Type: 'System.DateTime',
              CslType: 'datetime',
            },
          ],
        },
      },
      MajorVersion: 1,
      MinorVersion: 1,
      Functions: {
        test_function: {
          Name: 'test_function',
          InputParameters: [],
          Body: '{test_table | limit 1}',
          Folder: 'test',
          DocString: 'Test Function',
          FunctionKind: 'UnknownFunction',
          OutputColumns: [],
        },
      },
      DatabaseAccessMode: 'ReadWrite',
      ExternalTables: {},
      MaterializedViews: {
        test_materialized: {
          Name: 'test_materialized',
          OrderedColumns: [
            {
              Name: 'test_column',
              Type: 'System.Int64',
              CslType: 'long',
            },
            {
              Name: 'test_time',
              Type: 'System.DateTime',
              CslType: 'datetime',
            },
          ],
        },
      },
      EntityGroups: {},
    },
  },
};

const datasource = mockDatasource({
  getDefaultOrFirstDatabase: jest.fn().mockResolvedValue('test_db'),
  getDatabases: jest.fn().mockResolvedValue([{ text: 'test_db', value: 'test_db' }]),
  getSchema: jest.fn().mockResolvedValue(mockSchema),
  getClusters: jest.fn().mockResolvedValue([{ name: 'cluster_name', value: 'cluster_value' }]),
  query: jest.fn().mockReturnValue(
    of({
      data: [
        {
          refId: 'test',
          meta: {
            typeVersion: [0, 0],
            custom: {
              ColumnTypes: ['datetime', 'real', 'string'],
            },
            executedQueryString: 'test',
          },
          fields: [
            {
              name: 'timestamp',
              type: 'time',
              typeInfo: {
                frame: 'time.Time',
                nullable: true,
              },
              config: {},
              values: [1000000000],
              entities: {},
            },
            {
              name: 'value',
              type: 'number',
              typeInfo: {
                frame: 'float64',
                nullable: true,
              },
              config: {},
              values: [9.9],
              entities: {},
            },
            {
              name: 'string',
              type: 'string',
              typeInfo: {
                frame: 'string',
                nullable: true,
              },
              config: {},
              values: ['test_string'],
              entities: {},
            },
          ],
          length: 1,
        },
      ],
      state: 'Done',
    })
  ),
});

describe('variables', () => {
  describe('migrations', () => {
    it('will migrate databases query', async () => {
      const buildQuerySpy = jest.spyOn(datasource, 'buildQuery');
      const variableSupport = new VariableSupport(datasource);
      const req = mockRequest({ targets: ['databases()' as unknown as KustoQuery] });
      const res = await lastValueFrom(variableSupport.query(req));

      expect(datasource.getDefaultOrFirstDatabase).toBeCalled();
      expect(datasource.getDatabases).toBeCalled();
      expect(buildQuerySpy).toBeCalledWith('databases()', { scopedVars: {} }, 'test_db', 'clusterUrl');
      expect(res.data).toEqual([toDataFrame([{ text: 'test_db', value: 'test_db' }])]);
    });

    it('will migrate text query', async () => {
      const buildQuerySpy = jest.spyOn(datasource, 'buildQuery');
      const variableSupport = new VariableSupport(datasource);
      const req = mockRequest({ targets: ['test' as unknown as KustoQuery] });
      const res = await lastValueFrom(variableSupport.query(req));

      expect(datasource.getDefaultOrFirstDatabase).toBeCalled();
      expect(buildQuerySpy).toBeCalledWith('test', { scopedVars: {} }, 'test_db', 'clusterUrl');
      expect(datasource.query).toBeCalled();
      expect(res.data).toEqual([{ text: 'test_string' }]);
    });
  });

  describe('variable queries', () => {
    it('will run a database variable query', async () => {
      const variableSupport = new VariableSupport(datasource);
      const req = mockRequest({
        targets: [
          {
            ...defaultQuery,
            database: '',
            resultFormat: 'table',
            refId: '',
            queryType: AdxQueryType.Databases,
            clusterUri: '',
          },
        ],
      });
      const res = await lastValueFrom(variableSupport.query(req));

      expect(datasource.getDatabases).toBeCalled();
      expect(res.data).toEqual([toDataFrame([{ text: 'test_db', value: 'test_db' }])]);
    });

    it('will run a tables variable query', async () => {
      const variableSupport = new VariableSupport(datasource);
      const req = mockRequest({
        targets: [
          {
            ...defaultQuery,
            database: 'test_db',
            resultFormat: 'table',
            refId: '',
            queryType: AdxQueryType.Tables,
            clusterUri: '',
          },
        ],
      });
      const res = await lastValueFrom(variableSupport.query(req));
      expect(res.data).toEqual([toDataFrame([mockSchema.Databases.test_db.Tables.test_table])]);
    });

    it('will run a columns variable query', async () => {
      const variableSupport = new VariableSupport(datasource);
      const req = mockRequest({
        targets: [
          {
            ...defaultQuery,
            database: 'test_db',
            table: 'test_table',
            resultFormat: 'table',
            refId: '',
            queryType: AdxQueryType.Columns,
            clusterUri: '',
          },
        ],
      });
      const res = await lastValueFrom(variableSupport.query(req));
      expect(res.data).toEqual([toDataFrame([{ Name: 'test_column' }, { Name: 'time' }])]);
    });
  });
});
