import {KustoDBDatasource} from './datasource';

describe('KustoDBDatasource', function() {
  let ctx: any = {
    backendSrv: {},
    // templateSrv: new TemplateSrvStub()
  };

  beforeEach(function() {
    ctx.instanceSettings = {
      url: 'http://kustodb.com',
      jsonData: { },
    };

    ctx.ds = new KustoDBDatasource(ctx.instanceSettings, ctx.backendSrv);
  });

  describe('When performing testDatasource', function() {
    describe('and an error is returned', function() {
      const error = {
        data: {
          error: {
            code: 'ErrorCode',
            message: `An error message.`
          }
        },
        status: 400,
        statusText: 'Bad Request'
      };

      beforeEach(function() {
        ctx.backendSrv.datasourceRequest = function(options) {
          return ctx.$q.reject(error);
        };
      });

      it('should return error status and a detailed error message', function() {
        return ctx.ds.testDatasource().then(function(results) {
          expect(results.status).toEqual('error');
          expect(results.message).toEqual('An error message.');
        });
      });
    });
  });
});
