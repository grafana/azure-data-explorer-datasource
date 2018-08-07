import { KustoDBDatasource } from './datasource';
import q from 'q';

describe('KustoDBDatasource',() => {
  let ctx: any = {
    backendSrv: {},
    // templateSrv: new TemplateSrvStub()
  };

  beforeEach(() => {
    ctx.$q = q;
    ctx.instanceSettings = {
      url: 'http://kustodb.com',
      jsonData: {},
    };

    ctx.ds = new KustoDBDatasource(ctx.instanceSettings, ctx.backendSrv);
  });

  describe('When performing testDatasource', () => {
    describe('and an Authorization error is returned', () => {
      const error = {
        data: {
          Message: 'Authorization has been denied for this request.'
        },
        status: 401,
        statusText: 'Unauthorized',
      };

      beforeEach(function() {
        ctx.backendSrv.datasourceRequest = (options) => {
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
});
