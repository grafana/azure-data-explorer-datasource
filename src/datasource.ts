import _ from 'lodash';
import { ResponseParser, DatabaseItem } from './response_parser';
import QueryBuilder from './query_builder';
import Cache from './cache';
import RequestAggregator from './request_aggregator';

export class KustoDBDatasource {
  id: number;
  name: string;
  baseUrl: string;
  url: string;
  defaultOrFirstDatabase: string;
  cache: Cache;
  requestAggregatorSrv: RequestAggregator;

  /** @ngInject */
  constructor(
    instanceSettings,
    private backendSrv,
    private $q,
    private templateSrv,
  ) {
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;
    this.baseUrl = `/azuredataexplorer`;
    this.url = instanceSettings.url;
    this.defaultOrFirstDatabase = instanceSettings.jsonData.defaultDatabase;
    this.cache = new Cache({ ttl: this.getCacheTtl(instanceSettings) });
    this.requestAggregatorSrv = new RequestAggregator(backendSrv);
  }

  query(options) {
    const queries = _.filter(options.targets, item => {
      return (
        item.hide !== true &&
        item.query &&
        item.query.indexOf('<table name>') === -1
      );
    }).map(target => {
      const url = `${this.baseUrl}/v1/rest/query`;
      const interpolatedQuery = new QueryBuilder(
        this.templateSrv.replace(
          target.query,
          options.scopedVars,
          this.interpolateVariable,
        ),
        options,
      ).interpolate().query;

      return {
        key: `${url}-${options.intervalMs}-${options.maxDataPoints}-${
          options.format
        }-${target.resultFormat}-${interpolatedQuery}`,
        refId: target.refId,
        intervalMs: options.intervalMs,
        maxDataPoints: options.maxDataPoints,
        datasourceId: this.id,
        url: url,
        query: interpolatedQuery,
        format: options.format,
        resultFormat: target.resultFormat,
        data: {
          csl: interpolatedQuery,
          db: target.database,
        },
      };
    });

    if (!queries || queries.length === 0) {
      return { data: [] };
    }

    const promises = this.doQueries(queries);

    return this.$q.all(promises).then(results => {
      return new ResponseParser().parseQueryResult(results);
    });
  }

  annotationQuery(options) {
    if (!options.annotation.rawQuery) {
      return this.$q.reject({
        message: 'Query missing in annotation definition',
      });
    }

    const queries: any[] = this.buildQuery(
      options.annotation.rawQuery,
      options,
      options.annotation.database,
    );

    const promises = this.doQueries(queries);

    return this.$q.all(promises).then(results => {
      const annotations = new ResponseParser().transformToAnnotations(
        options,
        results,
      );
      return annotations;
    });
  }

  metricFindQuery(query: string) {
    return this.getDefaultOrFirstDatabase().then(database => {
      const queries: any[] = this.buildQuery(query, null, database);

      const promises = this.doQueries(queries);

      return this.$q
        .all(promises)
        .then(results => {
          return new ResponseParser().parseToVariables(results);
        })
        .catch(err => {
          if (err.error && err.error.data && err.error.data.error) {
            throw { message: err.error.data.error['@message'] };
          }
        });
    });
  }

  testDatasource() {
    return this.testDatasourceConnection()
      .then(() => this.testDatasourceAccess())
      .catch(error => {
        return {
          status: 'error',
          message:
            error.message + ' Connection to database could not be established.',
        };
      });
  }

  testDatasourceConnection() {
    const url = `${this.baseUrl}/v1/rest/mgmt`;
    const req = {
      csl: '.show databases',
    };
    return this.doRequest(url, req)
      .then(response => {
        if (response.status === 200) {
          return {
            status: 'success',
            message: 'Successfully queried the Azure Data Explorer database.',
            title: 'Success',
          };
        }

        return {
          status: 'error',
          message: 'Returned http status code ' + response.status,
        };
      })
      .catch(error => {
        let message = 'Azure Data Explorer: ';
        message += error.statusText ? error.statusText + ': ' : '';

        if (error.data && error.data.Message) {
          message += error.data.Message;
        } else if (error.data) {
          message += error.data;
        } else {
          message += 'Cannot connect to the Azure Data Explorer REST API.';
        }
        return {
          status: 'error',
          message: message,
        };
      });
  }

  testDatasourceAccess() {
    const url = `${this.baseUrl}/v1/rest/mgmt`;
    const req = {
      csl: '.show databases schema',
    };
    return this.doRequest(url, req)
      .then(response => {
        if (response.status === 200) {
          return {
            status: 'success',
            message: 'Successfully queried the Azure Data Explorer database.',
            title: 'Success',
          };
        }

        return {
          status: 'error',
          message: 'Returned http status code ' + response.status,
        };
      })
      .catch(error => {
        let message =
          'Azure Data Explorer: Cannot read database schema from REST API. ';
        message += error.statusText ? error.statusText + ': ' : '';

        if (error.data && error.data.error && error.data.error['@message']) {
          message += error.data.error && error.data.error['@message'];
        } else if (error.data) {
          message += JSON.stringify(error.data);
        } else {
          message +=
            'Cannot read database schema from Azure Data Explorer REST API.';
        }
        return {
          status: 'error',
          message: message,
        };
      });
  }

  getDatabases(): Promise<DatabaseItem[]> {
    const url = `${this.baseUrl}/v1/rest/mgmt`;
    const req = {
      csl: '.show databases',
    };

    return this.doRequest(url, req).then(response => {
      return new ResponseParser().parseDatabases(response);
    });
  }

  getDefaultOrFirstDatabase() {
    if (this.defaultOrFirstDatabase) {
      return Promise.resolve(this.defaultOrFirstDatabase);
    }

    return this.getDatabases().then(databases => {
      this.defaultOrFirstDatabase = databases[0].value;
      return this.defaultOrFirstDatabase;
    });
  }

  getSchema(database) {
    const url = `${this.baseUrl}/v1/rest/mgmt`;
    const req = {
      csl: `.show database [${database}] schema as json`,
    };

    return this.doRequest(url, req).then(response => {
      return new ResponseParser().parseSchemaResult(response.data);
    });
  }

  doQueries(queries) {
    return queries.map(query => {
      const cacheResponse = this.cache.get(query.key);
      if (cacheResponse) {
        return cacheResponse;
      } else {
        return this.requestAggregatorSrv
          .dsPost(query.key, this.url + query.url, query.data)
          .then(result => {
            const res = {
              result: result,
              query: query,
            };
            if (query.key) {
              this.cache.put(query.key, res);
            }
            return res;
          })
          .catch(err => {
            throw {
              error: err,
              query: query,
            };
          });
      }
    });
  }

  private buildQuery(query: string, options: any, database: string) {
    const queryBuilder = new QueryBuilder(
      this.templateSrv.replace(query, {}, this.interpolateVariable),
      options,
    );
    const url = `${this.baseUrl}/v1/rest/query`;
    const csl = queryBuilder.interpolate().query;
    const queries: any[] = [];
    queries.push({
      key: `${url}-table-${database}-${csl}`,
      datasourceId: this.id,
      url: url,
      resultFormat: 'table',
      data: {
        csl,
        db: database,
      },
    });
    return queries;
  }

  doRequest(url, data, maxRetries = 1) {
    return this.backendSrv
      .datasourceRequest({
        url: this.url + url,
        method: 'POST',
        data: data,
      })
      .catch(error => {
        if (maxRetries > 0) {
          return this.doRequest(url, data, maxRetries - 1);
        }

        throw error;
      });
  }

  interpolateVariable(value, variable) {
    if (typeof value === 'string') {
      if (variable.multi || variable.includeAll) {
        return "'" + value + "'";
      } else {
        return value;
      }
    }

    if (typeof value === 'number') {
      return value;
    }

    var quotedValues = _.map(value, function(val) {
      if (typeof value === 'number') {
        return value;
      }

      return "'" + val + "'";
    });
    return quotedValues.join(',');
  }

  getCacheTtl(instanceSettings) {
    if (instanceSettings.jsonData.minimalCache === undefined) {
      // default ttl is 30 sec
      return 30000;
    }

    if (instanceSettings.jsonData.minimalCache < 1) {
      throw new Error('Minimal cache must be greater than or equal to 1.');
    }

    return instanceSettings.jsonData.minimalCache * 1000;
  }
}
