import _ from 'lodash';
import { MetricFindValue } from '@grafana/data';
import { ResponseParser, DatabaseItem } from './response_parser';
import QueryBuilder from './query_builder';
import Cache from './cache';
import RequestAggregator from './request_aggregator';
//import { isTemplateElement } from '@babel/types';

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
      const interpolatedQuery = new QueryBuilder(
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
        url: '/api/ds/query',
        method: 'POST',
        data: {
          from: options.range.from.valueOf().toString(),
          to: options.range.to.valueOf().toString(),
          queries: queries,
        },
      })
      .then(results => {
        const responseParser = new ResponseParser();
        const ret = responseParser.processQueryResult(results);
        return this.processAlias(queryTargets, ret);
      });
  }

  processAlias(queryTargets: {}, response: any) {
    return {
      ...response,
      data: response.data.map(r => {
        const templateVars = {};
        const query = queryTargets[r.refId];
        // Table format does not use aliases yet. The user could
        // control the table format using aliases in the query itself
        // ex: data | project NewColumnName=ColumnName
        if (query.resultFormat !== 'table') {
          let alias = query.alias;
          try {
            const key = Object.keys(r.target)[0];
            let meta = r.target;
            if (key !== '0') {
              meta = r.target[key];
            }
            const full = JSON.stringify(r.target)
              .replace(/"/g, '')
              .replace(/^\{(.*?)\}$/, '$1');
            // Generating a default time series metric name requires both the metricname
            // and the value, but only if multiple values were requested.
            // By default, and for backwards compatibility, if there is only one metric
            // in the alias values, use that one.
            let defaultAlias = meta[Object.keys(meta)[0]];
            if (typeof response.valueCount !== 'undefined' && response.valueCount > 1) {
              defaultAlias =
                Object.keys(meta)
                  .map(key => '$' + key)
                  .join('.') + '.$value';
            }
            templateVars['value'] = { text: key, value: key };
            templateVars['full'] = { text: full, value: full };
            Object.keys(meta).forEach(t => {
              templateVars[t] = { text: meta[t], value: meta[t] };
            });
            if (!alias) {
              alias = defaultAlias;
            }
            r.target = this.templateSrv.replace(alias, templateVars);
          } catch (ex) {
            console.log('Error generating time series alias', ex);
          }
        }

        return r;
      }),
    };
  }

  annotationQuery(options) {
    if (!options.annotation.rawQuery) {
      return this.$q.reject({
        message: 'Query missing in annotation definition',
      });
    }

    const queries: any[] = this.buildQuery(options.annotation.rawQuery, options, options.annotation.database);
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
        return new ResponseParser().parseAnnotations(results, options);
      });
  }

  metricFindQuery(query: string, optionalOptions: any): Promise<MetricFindValue[]> {
    return this.getDefaultOrFirstDatabase()
      .then(database => this.buildQuery(query, optionalOptions, database))
      .then(queries =>
        this.backendSrv.datasourceRequest({
          url: '/api/tsdb/query',
          method: 'POST',
          data: {
            from: '5m',
            to: 'now',
            queries,
          },
        })
      )
      .then(response => {
        const responseParser = new ResponseParser();
        const processedResposne = responseParser.processQueryResult(response);
        return responseParser.processVariableQueryResult(processedResposne);
      })
      .catch(err => {
        console.log('There was an error', err);
        throw err;
      });
  }

  testDatasource() {
    return this.backendSrv
      .datasourceRequest({
        url: '/api/ds/query',
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
    if (!options) {
      options = {};
    }
    if (!options.hasOwnProperty('scopedVars')) {
      options['scopedVars'] = {};
    }
    const queryBuilder = new QueryBuilder(this.templateSrv.replace(query, options.scopedVars, this.interpolateVariable), options);
    const url = `${this.baseUrl}/v1/rest/query`;
    const interpolatedQuery = queryBuilder.interpolate().query;
    const queries: any[] = [];
    queries.push({
      key: `${url}-table-${database}-${interpolatedQuery}`,
      datasourceId: this.id,
      url: url,
      resultFormat: 'table',
      query: interpolatedQuery,
      database,
    });
    return queries;
  }

  // refId: item.refId,
  // intervalMs: options.intervalMs,
  // maxDataPoints: options.maxDataPoints,
  // datasourceId: this.id,
  // query: interpolatedQuery,
  // database: item.database,
  // resultFormat: item.resultFormat,

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

    const quotedValues = _.map(value, val => {
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
