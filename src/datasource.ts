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
  constructor(instanceSettings, private backendSrv, private $q, private templateSrv) {
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;
    this.baseUrl = `/azuredataexplorer`;
    this.url = instanceSettings.url;
    this.defaultOrFirstDatabase = instanceSettings.jsonData.defaultDatabase;
    this.cache = new Cache({ ttl: this.getCacheTtl(instanceSettings) });
    this.requestAggregatorSrv = new RequestAggregator(backendSrv);
  }

  // query uses the backend plugin route.
  query(options) {
    const queryTargets = {};

    const queries = _.filter(options.targets, item => {
      queryTargets[item.refId] = item;
      return item.hide !== true;
    }).map(item => {
      var interpolatedQuery = new QueryBuilder(
        this.templateSrv.replace(item.query, options.scopedVars, this.interpolateVariable),
        options
      ).interpolate().query;

      return {
        refId: item.refId,
        intervalMs: options.intervalMs,
        maxDataPoints: options.maxDataPoints,
        datasourceId: this.id,
        query: interpolatedQuery,
        database: item.database,
        resultFormat: item.resultFormat,
      };
    });

    if (queries.length === 0) {
      return this.$q.when({ data: [] });
    }

    return this.backendSrv
      .datasourceRequest({
        url: '/api/tsdb/query',
        method: 'POST',
        data: {
          from: options.range.from.valueOf().toString(),
          to: options.range.to.valueOf().toString(),
          queries: queries,
        },
      })
      .then(results => {
        let ret = new ResponseParser().processQueryResult(results);
        ret.data.forEach(r => {
          let templateVars = {};
          let target = queryTargets[r.refId];
          let alias = target.alias;
          let meta = JSON.parse(r.target);
          let value = Object.keys(meta)[0];
          templateVars['value'] = { text: value, value: value };
          Object.keys(meta[value]).forEach(t => {
            templateVars[t] = { text: meta[value][t], value: meta[value][t] };
          });
          if (!alias) {
            alias = '$metricname';
          }

          r.target = this.templateSrv.replace(alias, templateVars);
        });

        return ret;
      });
  }

  annotationQuery(options) {
    if (!options.annotation.rawQuery) {
      return this.$q.reject({
        message: 'Query missing in annotation definition',
      });
    }

    const queries: any[] = this.buildQuery(options.annotation.rawQuery, options, options.annotation.database);

    const promises = this.doQueries(queries);

    return this.$q.all(promises).then(results => {
      const annotations = new ResponseParser().transformToAnnotations(options, results);
      return annotations;
    });
  }

  metricFindQuery(query: string, optionalOptions: any) {
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
    return this.backendSrv
      .datasourceRequest({
        url: '/api/tsdb/query',
        method: 'POST',
        data: {
          from: '5m',
          to: 'now',
          queries: [
            {
              refId: 'A',
              intervalMs: 1,
              maxDataPoints: 1,
              datasourceId: this.id,
              query: '.show databases',
              resultFormat: 'test',
            },
          ],
        },
      })
      .then((res: any) => {
        return { status: 'success', message: 'Connection Successful' };
      })
      .catch((err: any) => {
        if (err.data && err.data.message) {
          return { status: 'error', message: err.data.message };
        } else {
          return { status: 'error', message: err.status };
        }
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
    const queryBuilder = new QueryBuilder(this.templateSrv.replace(query, {}, this.interpolateVariable), options);
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
