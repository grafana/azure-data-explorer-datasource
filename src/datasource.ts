import _ from 'lodash';
import { ResponseParser, DatabaseItem } from './response_parser';
import QueryBuilder from './query_builder';

export class KustoDBDatasource {
  id: number;
  name: string;
  baseUrl: string;
  url: string;
  defaultOrFirstDatabase: string;

  /** @ngInject */
  constructor(instanceSettings, private backendSrv, private $q, private templateSrv) {
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;
    this.baseUrl = `/kustodb`;
    this.url = instanceSettings.url;
    this.defaultOrFirstDatabase = instanceSettings.jsonData.defaultDatabase;
  }

  query(options) {
    const queries = _.filter(options.targets, item => {
      return item.hide !== true;
    }).map(target => {
      const url = `${this.baseUrl}/v1/rest/query`;

      return {
        refId: target.refId,
        intervalMs: options.intervalMs,
        maxDataPoints: options.maxDataPoints,
        datasourceId: this.id,
        url: url,
        query: target.query,
        format: options.format,
        resultFormat: target.resultFormat,
        data: {
          csl: new QueryBuilder(
            this.templateSrv.replace(target.query, options.scopedVars, this.interpolateVariable),
            options
          ).interpolate().query,
          db: target.database,
        },
      };
    });

    if (!queries || queries.length === 0) {
      return;
    }

    const promises = this.doQueries(queries);

    return this.$q.all(promises).then(results => {
      return new ResponseParser().parseQueryResult(results);
    });
  }

  annotationQuery(options) {}

  metricFindQuery(query: string) {
    return this.getDefaultOrFirstDatabase().then(database => {
      const queries: any[] = this.buildQuery(query, null, database);

      const promises = this.doQueries(queries);

      return this.$q.all(promises).then(results => {
        return new ResponseParser().parseToVariables(results);
      });
    });
  }

  testDatasource() {
    const url = `${this.baseUrl}/v1/rest/mgmt`;
    const req = {
      csl: '.show databases',
    };
    return this.doRequest(url, req)
      .then(response => {
        if (response.status === 200) {
          return {
            status: 'success',
            message: 'Successfully queried the Kusto database.',
            title: 'Success',
          };
        }

        return {
          status: 'error',
          message: 'Returned http status code ' + response.status,
        };
      })
      .catch(error => {
        let message = 'KustoDB: ';
        message += error.statusText ? error.statusText + ': ' : '';

        if (error.data && error.data.Message) {
          message += error.data.Message;
        } else if (error.data) {
          message += error.data;
        } else {
          message += 'Cannot connect to the KustoDB REST API.';
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
    return _.map(queries, query => {
      return this.doRequest(query.url, query.data)
        .then(result => {
          return {
            result: result,
            query: query,
          };
        })
        .catch(err => {
          throw {
            error: err,
            query: query,
          };
        });
    });
  }

  private buildQuery(query: string, options: any, database: string) {
    const queryBuilder = new QueryBuilder(
      this.templateSrv.replace(query, {}, this.interpolateVariable),
      options,
    );
    const url = `${this.baseUrl}/v1/rest/query`;

    const queries: any[] = [];
    queries.push({
      datasourceId: this.id,
      url: url,
      resultFormat: 'table',
      data: {
        csl: queryBuilder.interpolate().query,
        db: database,
      }
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
}
