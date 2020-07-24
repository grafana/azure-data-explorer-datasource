import { KustoDBDatasource } from './datasource';
import q from 'q';
import { dateTime } from '@grafana/data';
import { TemplateSrv } from './test/template_srv';
import _ from 'lodash';

describe('KustoDBDatasource', () => {
  const ctx: any = {
    backendSrv: {},
    templateSrv: new TemplateSrv(),
  };

  beforeEach(() => {
    ctx.$q = q;
    ctx.instanceSettings = {
      url: 'http://kustodb.com',
      jsonData: {},
    };

    ctx.ds = new KustoDBDatasource(ctx.instanceSettings, ctx.backendSrv, ctx.$q, ctx.templateSrv);
  });

  describe('when performing getDatabases', () => {
    const response = {
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

    beforeEach(() => {
      ctx.backendSrv.datasourceRequest = options => {
        expect(options.url).toContain('/v1/rest/mgmt');
        return ctx.$q.when({ data: response, status: 200 });
      };
    });

    it('should return a list of databases', () => {
      return ctx.ds.getDatabases().then(results => {
        expect(results[0].text).toBe('Grafana');
        expect(results[0].value).toBe('Grafana');
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
      ctx.backendSrv.datasourceRequest = options => {
        expect(options.url).toContain('/v1/rest/mgmt');
        return ctx.$q.when({ data: response, status: 200 });
      };
    });

    it('should return a parsed schema', () => {
      return ctx.ds.getSchema().then(result => {
        expect(Object.keys(result.Databases.Grafana.Tables).length).toBe(1);
        expect(result.Databases.Grafana.Tables.MyLogs.Name).toBe('MyLogs');
      });
    });
  });

  describe('when performing annotations query', () => {
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
      ctx.backendSrv.datasourceRequest = options => {
        if (options.url.indexOf('rest/mgmt') > -1) {
          return ctx.$q.when({ data: databasesResponse, status: 200 });
        } else {
          return ctx.$q.when({ data: tableResponse, status: 200 });
        }
      };

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

  describe('Test cache ttl', () => {
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
      } catch (err) {
        expect(err.message).toContain('Minimal cache must be greater than or equal to 1.');
      }
    });
  });

  describe('test alias parsing', () => {
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
