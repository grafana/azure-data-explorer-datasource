import { KustoDBDatasource } from './datasource';
import q from 'q';
import moment from 'moment';
import TemplateSrvStub from '../test/template_srv_stub';


describe('KustoDBDatasource', () => {
  let ctx: any = {
    backendSrv: {},
    templateSrv: new TemplateSrvStub()
  };

  beforeEach(() => {
    ctx.$q = q;
    ctx.instanceSettings = {
      url: 'http://kustodb.com',
      jsonData: {},
    };

    ctx.ds = new KustoDBDatasource(ctx.instanceSettings, ctx.backendSrv, ctx.$q, ctx.templateSrv);
  });

  describe('When performing testDatasource', () => {
    describe('and an Authorization error is returned', () => {
      const error = {
        data: {
          Message: 'Authorization has been denied for this request.',
        },
        status: 401,
        statusText: 'Unauthorized',
      };

      beforeEach(function() {
        ctx.backendSrv.datasourceRequest = options => {
          return ctx.$q.reject(error);
        };
      });

      it('should return error status and a detailed error message', () => {
        return ctx.ds.testDatasource().then(results => {
          expect(results.status).toEqual('error');
          expect(results.message).toEqual('KustoDB: Unauthorized: Authorization has been denied for this request.');
        });
      });
    });
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
            { ColumnName: 'CurrentUserIsUnrestrictedViewer', DataType: 'Boolean' },
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

    beforeEach(function() {
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

    beforeEach(function() {
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

  describe('When performing metricFindQuery', () => {
    const tableResponseWithOneColumn = {
      Tables: [
        {
          TableName: 'Table_0',
          Columns: [
            {
              ColumnName: 'Category',
              ColumnType: 'string',
            },
          ],
          Rows: [['Administrative'], ['Policy']],
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
            { ColumnName: 'CurrentUserIsUnrestrictedViewer', DataType: 'Boolean' },
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

    let queryResults;

    beforeEach(async () => {
      ctx.backendSrv.datasourceRequest = options => {
        console.log(options.url);
        if (options.url.indexOf('rest/mgmt') > -1) {
          return ctx.$q.when({ data: databasesResponse, status: 200 });
        } else {
          return ctx.$q.when({ data: tableResponseWithOneColumn, status: 200 });
        }
      };

      queryResults = await ctx.ds.metricFindQuery('Activity | distinct Category');
    });

    it('should return a list of categories in the correct format', () => {
      expect(queryResults.length).toBe(2);
      expect(queryResults[0].text).toBe('Administrative');
      expect(queryResults[0].value).toBe('Administrative');
      expect(queryResults[1].text).toBe('Policy');
      expect(queryResults[1].value).toBe('Policy');
    });
  });

  describe('when performing query', () => {
    const queryOptions = {
      range: {
        from: moment.utc('2017-08-22T20:00:00Z'),
        to: moment.utc('2017-08-22T23:59:00Z'),
      },
      rangeRaw: {
        from: 'now-4h',
        to: 'now',
      },
      targets: [
        {
          apiVersion: '2016-09-01',
          refId: 'A',
          resultFormat: 'time_series',
          database: 'Grafana',
          query: [
            'MyLogs',
            '| summarize count() by Level, bin(Timestamp, 5min)',
            '| project Timestamp, Level, count_',
            '| order by Timestamp asc',
          ].join(),
        },
      ],
    };

    const response = {
      Tables: [
        {
          TableName: 'Table_0',
          Columns: [
            { ColumnName: 'Timestamp', DataType: 'DateTime', ColumnType: 'datetime' },
            { ColumnName: 'Level', DataType: 'String', ColumnType: 'string' },
            { ColumnName: 'count_', DataType: 'Int64', ColumnType: 'long' },
          ],
          Rows: [['2018-07-30T17:33:59.927Z', 'Error', 1]],
        },
      ],
    };

    describe('in time series format', () => {
      describe('and the data is valid (has time, metric and value columns)', () => {
        let results;

        beforeEach(async () => {
          ctx.backendSrv.datasourceRequest = options => {
            expect(options.url).toContain('rest/query');
            expect(options.data.db).toBe('Grafana');
            expect(options.data.csl).toBe(queryOptions.targets[0].query);
            return ctx.$q.when({ data: response, status: 200 });
          };
          results = await ctx.ds.query(queryOptions);
        });

        it('should return a list of datapoints', () => {
          expect(results.data.length).toBe(1);
          expect(results.data[0].datapoints.length).toBe(1);
          expect(results.data[0].target).toEqual('Error');
          expect(results.data[0].datapoints[0][1]).toEqual(1532972039927);
          expect(results.data[0].datapoints[0][0]).toEqual(1);
        });
      });
    });

    describe('and is in table format', () => {
      let results;

      beforeEach(async () => {
        queryOptions.targets[0].resultFormat = 'table';
        ctx.backendSrv.datasourceRequest = options => {
          expect(options.url).toContain('rest/query');
          expect(options.data.db).toBe('Grafana');
          expect(options.data.csl).toBe(queryOptions.targets[0].query);
          return ctx.$q.when({ data: response, status: 200 });
        };
        results = await ctx.ds.query(queryOptions);
      });

      it('should return a list of columns and rows', () => {
        expect(results.data[0].type).toBe('table');
        expect(results.data[0].columns.length).toBe(3);
        expect(results.data[0].rows.length).toBe(1);
        expect(results.data[0].columns[0].text).toBe('Timestamp');
        expect(results.data[0].columns[0].type).toBe('datetime');
        expect(results.data[0].columns[1].text).toBe('Level');
        expect(results.data[0].columns[1].type).toBe('string');
        expect(results.data[0].columns[2].text).toBe('count_');
        expect(results.data[0].columns[2].type).toBe('long');
        expect(results.data[0].rows[0][0]).toEqual('2018-07-30T17:33:59.927Z');
        expect(results.data[0].rows[0][1]).toEqual('Error');
        expect(results.data[0].rows[0][2]).toEqual(1);
      });
    });
  });
});
