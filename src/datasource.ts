import _ from 'lodash';

export class KustoDBDatasource {
  id: number;
  name: string;
  baseUrl: string;
  url: string;

  /** @ngInject */
  constructor(instanceSettings, private backendSrv) {
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;
    this.baseUrl = ``;
    this.url = instanceSettings.url;
  }

  query(options) {}

  annotationQuery(options) {}

  metricFindQuery(query: string) {}

  testDatasource() {
    const url = `${this.baseUrl}/v1/rest/mgmt`;
    const req = {
      csl: '.show databases'
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

        if (error.data && error.data.error && error.data.error.code) {
          message += error.data.error.code + '. ' + error.data.error.message;
        } else if (error.data && error.data.error) {
          message += error.data.error;
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

  doRequest(url, data, maxRetries = 1) {
    return this.backendSrv
      .datasourceRequest({
        url: this.url + url,
        method: 'POST',
        data: data
      })
      .catch(error => {
        if (maxRetries > 0) {
          return this.doRequest(url, data, maxRetries - 1);
        }

        throw error;
      });
  }
}
