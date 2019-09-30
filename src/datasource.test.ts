import { KustoDBDatasource } from './datasource';
import q from 'q';
import moment from 'moment';
import TemplateSrvStub from '../test/template_srv_stub';
import _ from 'lodash';

describe('KustoDBDatasource', () => {
  let ctx: any = {
    backendSrv: {},
    templateSrv: new TemplateSrvStub(),
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

    let queryResults;

    beforeEach(async () => {
      ctx.backendSrv.datasourceRequest = options => {
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

  describe('When performing metricFindQuery (two columns)', () => {
    const tableResponseWithTwoColumns = {
      Tables: [
        {
          TableName: 'Table_1',
          Columns: [
            {
              ColumnName: 'CatagoryId',
              ColumnType: 'int',
            },
            {
              ColumnName: 'CategoryName',
              ColumnType: 'string',
            }
          ],
          Rows: [
            [12], ['Titanic'],
            [13], ['Titanic'],
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

    let queryResults;

    beforeEach(async () => {
      ctx.backendSrv.datasourceRequest = options => {
        if (options.url.indexOf('rest/mgmt') > -1) {
          return ctx.$q.when({ data: databasesResponse, status: 200 });
        } else {
          return ctx.$q.when({ data: tableResponseWithTwoColumns, status: 200 });
        }
      };

      queryResults = await ctx.ds.metricFindQuery('Activity | project __value = CategoryId, __text = CategoryName');
    });

    it('should return a list of categories in the correct format', () => {
      expect(queryResults.length).toBe(4);
      expect(queryResults[0].text).toBe(12);
      expect(queryResults[0].value).toBe(12);
      expect(queryResults[1].text).toBe('Titanic');
      expect(queryResults[1].value).toBe('Titanic');
      expect(queryResults[2].text).toBe(13);
      expect(queryResults[2].value).toBe(13);
      expect(queryResults[3].text).toBe('Titanic');
      expect(queryResults[3].value).toBe('Titanic');
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
          Rows: [['2018-06-02T20:20:00Z', 'Computer1', 'tag1,tag2'], ['2018-06-02T20:28:00Z', 'Computer2', 'tag2']],
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
          rawQuery: 'Heartbeat | where $__timeFilter()| project TimeGenerated, Text=Computer, tags="test"',
          database: 'Grafana',
        },
        range: {
          from: moment.utc('2017-08-22T20:00:00Z'),
          to: moment.utc('2017-08-22T23:59:00Z'),
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
});
