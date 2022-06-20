import { AdxDataSource, sortStartsWithValuesFirst } from './datasource';
import { dateTime, toDataFrame } from '@grafana/data';
import _ from 'lodash';
import { setBackendSrv, BackendSrv, BackendSrvRequest } from '@grafana/runtime';
import { EditorMode } from 'types';
import { mockDatasource } from 'components/__fixtures__/Datasource';

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

describe('AdxDataSource', () => {
  const ctx: any = {};

  beforeEach(() => {
    ctx.instanceSettings = {
      url: 'http://kustodb.com',
      jsonData: {},
    };
  });

  describe('when performing getDatabases', () => {
    const response = setupTableResponse();

    beforeEach(() => {
      ctx.ds = new AdxDataSource(ctx.instanceSettings);
      ctx.ds.getResource = jest.fn().mockResolvedValue(response);
    });

    it('should return a list of databases', () => {
      return ctx.ds.getDatabases().then((results) => {
        expect(results[0].text).toBe('Grafana');
        expect(results[0].value).toBe('Grafana');
      });
    });
  });

  describe('When performing metricFindQuery', () => {
    describe('and is the databases() macro', () => {
      let queryResults;

      beforeEach(async () => {
        ctx.ds = new AdxDataSource(ctx.instanceSettings);
        ctx.ds.getResource = jest.fn().mockResolvedValue(setupTableResponse());

        queryResults = await ctx.ds.metricFindQuery('databases()');
      });

      it('should return a list of databases', () => {
        expect(queryResults.length).toBe(2);
        expect(queryResults[0].text).toBe('Grafana');
        expect(queryResults[0].value).toBe('Grafana');
      });
    });
  });

  describe('when performing getSchema', () => {
    const response = {
      Tables: [
        {
          TableName: 'Table_0',
          Columns: [
            {
              ColumnName: 'DatabaseSchema',
              DataType: 'String',
            },
          ],
          Rows: [
            [
              '{"Plugins":[{"Name":"preview"},{"Name":"pivot"}],' +
                '"Databases":{"Grafana":{"Name":"Grafana","Tables":{"MyLogs":{"Name":"MyLogs",' +
                '"OrderedColumns":[{"Name":"Level","Type":"System.String","CslType":"string"},' +
                '{"Name":"Timestamp","Type":"System.DateTime","CslType":"datetime"},' +
                '{"Name":"UserId","Type":"System.String","CslType":"string"},' +
                '{"Name":"TraceId","Type":"System.String","CslType":"string"},' +
                '{"Name":"Message","Type":"System.String","CslType":"string"},' +
                '{"Name":"ProcessId","Type":"System.Int32","CslType":"int"}]}},' +
                '"MajorVersion":5,"MinorVersion":3,"Functions":{},"DatabaseAccessMode":"ReadWrite"}}}',
            ],
          ],
        },
      ],
    };

    beforeEach(() => {
      ctx.ds = new AdxDataSource(ctx.instanceSettings);
      ctx.ds.getResource = jest.fn().mockResolvedValue(response);
    });

    it('should return a parsed schema', () => {
      return ctx.ds.getSchema().then((result) => {
        expect(Object.keys(result.Databases.Grafana.Tables).length).toBe(1);
        expect(result.Databases.Grafana.Tables.MyLogs.Name).toBe('MyLogs');
      });
    });
  });

  it.skip('when performing annotations query', () => {
    const tableResponse = {
      Tables: [
        {
          TableName: 'Table_0',
          Columns: [
            {
              ColumnName: 'Timestamp',
              DataType: 'DateTime',
              ColumnType: 'datetime',
            },
            { ColumnName: 'Text', DataType: 'String', ColumnType: 'string' },
            { ColumnName: 'Tags', DataType: 'String', ColumnType: 'string' },
          ],
          Rows: [
            ['2018-06-02T20:20:00Z', 'Computer1', 'tag1,tag2'],
            ['2018-06-02T20:28:00Z', 'Computer2', 'tag2'],
          ],
        },
      ],
    };

    const databasesResponse = {
      Tables: [
        {
          TableName: 'Table_0',
          Columns: [
            { ColumnName: 'DatabaseName', DataType: 'String' },
            { ColumnName: 'PersistentStorage', DataType: 'String' },
            { ColumnName: 'Version', DataType: 'String' },
            { ColumnName: 'IsCurrent', DataType: 'Boolean' },
            { ColumnName: 'DatabaseAccessMode', DataType: 'String' },
            { ColumnName: 'PrettyName', DataType: 'String' },
            {
              ColumnName: 'CurrentUserIsUnrestrictedViewer',
              DataType: 'Boolean',
            },
            { ColumnName: 'DatabaseId', DataType: 'Guid' },
          ],
          Rows: [
            [
              'Grafana',
              'https://4bukustoragekus86a3c.blob.core.windows.net/grafanamd201806201624130602',
              'v5.2',
              false,
              'ReadWrite',
              null,
              false,
              'a955a3ed-0668-4d00-a2e5-9c4e610ef057',
            ],
          ],
        },
      ],
    };

    let annotationResults;

    beforeEach(async () => {
      setBackendSrv({
        datasourceRequest(options: BackendSrvRequest): Promise<any> {
          if (options.url.indexOf('rest/mgmt') > -1) {
            return Promise.resolve({ data: databasesResponse });
          } else {
            return Promise.resolve({ data: tableResponse });
          }
        },
      } as BackendSrv);
      ctx.ds = new AdxDataSource(ctx.instanceSettings);

      annotationResults = await ctx.ds.annotationQuery({
        annotation: {
          rawQuery: 'Heartbeat | where $__timeFilter(TimeGenerated)| project TimeGenerated, Text=Computer, tags="test"',
          database: 'Grafana',
        },
        range: {
          from: dateTime([2017, 8, 11, 20, 0]),
          to: dateTime([2017, 8, 11, 23, 59]),
        },
        rangeRaw: {
          from: 'now-4h',
          to: 'now',
        },
      });
    });

    it('should return a list of categories in the correct format', () => {
      expect(annotationResults.length).toBe(2);

      expect(annotationResults[0].time).toBe(1527970800000);
      expect(annotationResults[0].text).toBe('Computer1');
      expect(annotationResults[0].tags[0]).toBe('tag1');
      expect(annotationResults[0].tags[1]).toBe('tag2');

      expect(annotationResults[1].time).toBe(1527971280000);
      expect(annotationResults[1].text).toBe('Computer2');
      expect(annotationResults[1].tags[0]).toBe('tag2');
    });
  });

  it.skip('Test cache ttl', () => {
    it('should return 30 seconds when json minimal cache is not set', () => {
      const ttl = ctx.ds.getCacheTtl(ctx.instanceSettings);
      expect(ttl).toEqual(30000);
    });

    it('should return the minimal cache value supplied in the json data', () => {
      ctx.instanceSettings.jsonData = {
        minimalCache: 1,
      };
      const ttl = ctx.ds.getCacheTtl(ctx.instanceSettings);
      expect(ttl).toEqual(1000);
    });

    it('should throw an exception when minimun cache is lower than 1', () => {
      ctx.instanceSettings.jsonData = {
        minimalCache: -5,
      };

      try {
        ctx.ds.getCacheTtl(ctx.instanceSettings);
      } catch (err: any) {
        expect(err.message).toContain('Minimal cache must be greater than or equal to 1.');
      }
    });
  });

  it.skip('test alias parsing', () => {
    it('Should parse adx timeseries data responses with default alias', () => {
      const result = ctx.ds.processAlias(
        {
          A: {
            alias: '',
            database: 'Grafana',
            query:
              "print id='abc', Timestamp=range(bin(now(), 1h)-11h, bin(now(), 1h), 1h), y=dynamic([2,5,6,8,11,15,17,18,25,26,30,30])",
            refId: 'A',
            resultFormat: 'time_series_adx_series',
            datasource: 'ADX',
          },
        },
        {
          data: [
            {
              target: {
                y: {
                  id: 'abc',
                },
              },
              datapoints: [[2, 1582171200000]],
              refId: 'A',
              meta: {
                KustoError: '',
                RawQuery:
                  "print id='abc', Timestamp=range(bin(now(), 1h)-11h, bin(now(), 1h), 1h), y=dynamic([2,5,6,8,11,15,17,18,25,26,30,30])",
                TimeNotASC: false,
              },
            },
          ],
          valueCount: 1,
        }
      );
      expect(result.data[0].target).toEqual('abc');
    });

    it('Should parse adx timeseries data responses with custom alias', () => {
      const result = ctx.ds.processAlias(
        {
          A: {
            alias: '$value',
            database: 'Grafana',
            query:
              "print id='abc', Timestamp=range(bin(now(), 1h)-11h, bin(now(), 1h), 1h), y=dynamic([2,5,6,8,11,15,17,18,25,26,30,30])",
            refId: 'A',
            resultFormat: 'time_series_adx_series',
            datasource: 'ADX',
          },
        },
        {
          data: [
            {
              target: {
                y: {
                  id: 'abc',
                },
              },
              datapoints: [[2, 1582171200000]],
              refId: 'A',
              meta: {
                KustoError: '',
                RawQuery:
                  "print id='abc', Timestamp=range(bin(now(), 1h)-11h, bin(now(), 1h), 1h), y=dynamic([2,5,6,8,11,15,17,18,25,26,30,30])",
                TimeNotASC: false,
              },
            },
          ],
          valueCount: 1,
        }
      );
      expect(result.data[0].target).toEqual('y');
    });
  });
});

describe('AdxDataSource', () => {
  describe('when constructing with defaultEditorMode', () => {
    it('then defaultEditorMode should be correct', () => {
      const instanceSettings: any = {
        jsonData: {
          defaultEditorMode: EditorMode.Raw,
        },
      };

      const datasource = new AdxDataSource(instanceSettings);

      expect(datasource.getDefaultEditorMode()).toEqual(EditorMode.Raw);
    });
  });

  describe('when constructing without defaultEditorMode', () => {
    it('then defaultEditorMode should be Visual', () => {
      const instanceSettings: any = {
        jsonData: {},
      };

      const datasource = new AdxDataSource(instanceSettings);

      expect(datasource.getDefaultEditorMode()).toEqual(EditorMode.Visual);
    });
  });

  describe('when getting a dynamic schema', () => {
    it('should return valid accessors', async () => {
      const datasource = mockDatasource();
      datasource.query = jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          data: [
            toDataFrame({
              fields: [
                {
                  name: 'schema_Teams',
                  type: 'string',
                  typeInfo: {
                    frame: 'string',
                  },
                  config: {},
                  values: ['{"18":{"TeamID":"long"}}'],
                  entities: {},
                },
              ],
            }),
          ],
        }),
      });

      expect(await datasource.getDynamicSchema('foo', 'bar', ['col'])).toEqual({
        Teams: [
          {
            CslType: 'long',
            Name: 'Teams["18"]["TeamID"]',
          },
        ],
      });
    });

    it('should return select the first type if multiple types are returned', async () => {
      const datasource = mockDatasource();
      datasource.query = jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({
          data: [
            toDataFrame({
              fields: [
                {
                  name: 'schema_Teams',
                  type: 'string',
                  typeInfo: {
                    frame: 'string',
                  },
                  config: {},
                  values: ['{"18":{"TeamID":["long","double"]}}'],
                  entities: {},
                },
              ],
            }),
          ],
        }),
      });

      expect(await datasource.getDynamicSchema('foo', 'bar', ['col'])).toEqual({
        Teams: [
          {
            CslType: 'long',
            Name: 'Teams["18"]["TeamID"]',
          },
        ],
      });
    });
  });
});

describe('sortStartsWithValuesFirst', () => {
  describe('when called with random ordered values', () => {
    it('then should order startsWith values on top followed by values that include searchText', () => {
      const arr = ['South Korea', 'Norway', 'Tailand', 'Taiwan', 'United States', 'Sweden', 'Finland'];
      const searchText = 't';

      const result = sortStartsWithValuesFirst(arr, searchText);

      expect(result).toEqual(['Tailand', 'Taiwan', 'South Korea', 'United States', 'Norway', 'Sweden', 'Finland']);
    });
  });
});

function setupTableResponse() {
  return {
    Tables: [
      {
        TableName: 'Table_0',
        Columns: [
          { ColumnName: 'DatabaseName', DataType: 'String' },
          { ColumnName: 'PersistentStorage', DataType: 'String' },
          { ColumnName: 'Version', DataType: 'String' },
          { ColumnName: 'IsCurrent', DataType: 'Boolean' },
          { ColumnName: 'DatabaseAccessMode', DataType: 'String' },
          { ColumnName: 'PrettyName', DataType: 'String' },
          {
            ColumnName: 'CurrentUserIsUnrestrictedViewer',
            DataType: 'Boolean',
          },
          { ColumnName: 'DatabaseId', DataType: 'Guid' },
        ],
        Rows: [
          [
            'Grafana',
            'https://4bukustoragekus86a3c.blob.core.windows.net/grafanamd201806201624130602',
            'v5.2',
            false,
            'ReadWrite',
            null,
            false,
            '1955a3ed-0668-4d00-a2e5-9c4e610ef057',
          ],
          [
            'Sample',
            'https://4bukustoragekus86a3c.blob.core.windows.net/grafanamd201806201624130602',
            'v5.2',
            false,
            'ReadWrite',
            null,
            false,
            '2955a3ed-0668-4d00-a2e5-9c4e610ef057',
          ],
        ],
      },
    ],
  };
}
