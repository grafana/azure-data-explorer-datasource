import {
  MetricFindValue,
  DataSourceInstanceSettings,
  DataQueryRequest,
  ScopedVar,
  TimeRange,
  DataFrame,
  AnnotationQueryRequest,
  AnnotationEvent,
  LoadingState,
} from '@grafana/data';
import { map } from 'lodash';
import { getBackendSrv, BackendSrv, getTemplateSrv, TemplateSrv, DataSourceWithBackend } from '@grafana/runtime';
import { ResponseParser, DatabaseItem } from './response_parser';
import { AdxDataSourceOptions, KustoQuery, AdxSchema } from './types';
import { getAnnotationsFromFrame } from './common/annotationsFromFrame';
import interpolateKustoQuery from './query_builder';
import { firstStringFieldToMetricFindValue } from 'common/responseHelpers';

export class AdxDataSource extends DataSourceWithBackend<KustoQuery, AdxDataSourceOptions> {
  private backendSrv: BackendSrv;
  private templateSrv: TemplateSrv;
  private baseUrl: string;
  private defaultOrFirstDatabase: string;
  private url?: string;

  constructor(instanceSettings: DataSourceInstanceSettings<AdxDataSourceOptions>) {
    super(instanceSettings);
    this.backendSrv = getBackendSrv();
    this.templateSrv = getTemplateSrv();
    this.baseUrl = '/azuredataexplorer';
    this.defaultOrFirstDatabase = instanceSettings.jsonData.defaultDatabase;
    this.url = instanceSettings.url;
  }

  // COMMENTING out alias for now... can use the displayName feature in fields
  //
  // query(request: DataQueryRequest<KustoQuery>): Observable<DataQueryResponse> {
  //   let hasAlias = false;
  //   for (const q of request.targets) {
  //     if (q.alias && q.resultFormat !== 'table') {
  //       hasAlias = true;
  //       break;
  //     }
  //   }

  //   if (hasAlias) {
  //     return super.query(request).pipe(
  //       mergeMap((res: DataQueryResponse) => {
  //         return of(this.processAlias(request, res));
  //       })
  //     );
  //   }

  //   // simple query
  //   return super.query(request);
  // }

  /**
   * Return true if it should execute
   */
  filterQuery(target: KustoQuery): boolean {
    if (target.hide) {
      return false;
    }
    if (target.rawMode) {
      return true; // anything else we can check
    }
    const table = (target.expression?.from as any)?.value;
    if (!table) {
      return false; // Don't execute things without a table selected
    }
    return true;
  }

  applyTemplateVariables(target: KustoQuery, scopedVars: ScopedVar): Record<string, any> {
    const q = interpolateKustoQuery(target.query);
    return {
      ...target,
      query: this.templateSrv.replace(q, scopedVars),
      database: this.templateSrv.replace(target.database, scopedVars),
    };
  }

  // processAlias(request: DataQueryRequest<KustoQuery>, res: DataQueryResponse): DataQueryResponse {
  //   if (!res.data || !res.data.length) {
  //     return res;
  //   }

  //   const byRefId: KeyValue<KustoQuery> = {};
  //   for (const target of request.targets) {
  //     if (target.alias && target.resultFormat !== 'table') {
  //       byRefId[target.refId] = target;
  //     }
  //   }

  //   return {
  //     ...res,
  //     data: res.data.map((frame: DataFrame) => {
  //       const query = byRefId[frame.refId!];
  //       if (query && query.alias) {
  //         console.log('TODO, alias', query.alias);
  //         try {
  //           const key = Object.keys(r.target)[0];
  //           let meta = r.target;
  //           if (key !== '0') {
  //             meta = r.target[key];
  //           }
  //           const full = JSON.stringify(r.target)
  //             .replace(/"/g, '')
  //             .replace(/^\{(.*?)\}$/, '$1');
  //           // Generating a default time series metric name requires both the metricname
  //           // and the value, but only if multiple values were requested.
  //           // By default, and for backwards compatibility, if there is only one metric
  //           // in the alias values, use that one.
  //           let defaultAlias = meta[Object.keys(meta)[0]];
  //           if (typeof response.valueCount !== 'undefined' && response.valueCount > 1) {
  //             defaultAlias =
  //               Object.keys(meta)
  //                 .map(key => '$' + key)
  //                 .join('.') + '.$value';
  //           }
  //           templateVars['value'] = { text: key, value: key };
  //           templateVars['full'] = { text: full, value: full };
  //           Object.keys(meta).forEach(t => {
  //             templateVars[t] = { text: meta[t], value: meta[t] };
  //           });
  //           if (!alias) {
  //             alias = defaultAlias;
  //           }
  //           r.target = this.templateSrv.replace(alias, templateVars);
  //         } catch (ex) {
  //           console.log('Error generating time series alias', ex);
  //         }
  //       }
  //       return frame;
  //     }),
  //   };
  // }

  async annotationQuery(options: AnnotationQueryRequest<KustoQuery>): Promise<AnnotationEvent[]> {
    const query = (options.annotation as any)?.annotation as KustoQuery;
    if (!query) {
      return Promise.reject({
        message: 'Query missing in annotation definition',
      });
    }

    return super
      .query({
        targets: [query],
        range: options.range as TimeRange,
      } as DataQueryRequest<KustoQuery>)
      .toPromise()
      .then(res => {
        if (res.state === LoadingState.Done) {
          if (res.data?.length) {
            return getAnnotationsFromFrame(res.data[0] as DataFrame);
          }
        }
        if (res.state === LoadingState.Error) {
          console.log('ADX Annotation ERROR???', options, res);
          return Promise.reject({
            message: options.annotation.name,
          });
        }
        return [];
      });
  }

  async metricFindQuery(query: string, optionalOptions: any): Promise<MetricFindValue[]> {
    const databasesQuery = query.match(/^databases\(\)/i);
    if (databasesQuery) {
      return this.getDatabases();
    }
    return this.getDefaultOrFirstDatabase()
      .then(database => this.buildQuery(query, optionalOptions, database))
      .then(query =>
        this.query({
          targets: [query],
        } as DataQueryRequest<KustoQuery>).toPromise()
      )
      .then(response => {
        if (response.data && response.data.length) {
          return firstStringFieldToMetricFindValue(response.data[0]);
        }
        return [];
      })
      .catch(err => {
        console.log('There was an error', err);
        throw err;
      });
  }

  async getDatabases(): Promise<DatabaseItem[]> {
    const url = `${this.baseUrl}/v1/rest/mgmt`;
    const req = {
      csl: '.show databases',
    };

    return this.doRequest(url, req).then(response => {
      return new ResponseParser().parseDatabases(response);
    });
  }

  async getDefaultOrFirstDatabase(): Promise<string> {
    if (this.defaultOrFirstDatabase) {
      return Promise.resolve(this.defaultOrFirstDatabase);
    }

    return this.getDatabases().then(databases => {
      this.defaultOrFirstDatabase = databases[0].value;
      return this.defaultOrFirstDatabase;
    });
  }

  async getSchema(): Promise<AdxSchema> {
    const url = `${this.baseUrl}/v1/rest/mgmt`;
    const req = {
      csl: `.show databases schema as json`,
    };

    return this.doRequest(url, req).then(response => {
      return new ResponseParser().parseSchemaResult(response.data);
    });
  }

  get variables() {
    return this.templateSrv.getVariables().map(v => `$${v.name}`);
  }

  // Used for annotations and templage variables
  private buildQuery(query: string, options: any, database: string): KustoQuery {
    if (!options) {
      options = {};
    }
    if (!options.hasOwnProperty('scopedVars')) {
      options['scopedVars'] = {};
    }
    const interpolatedQuery = interpolateKustoQuery(query);
    return {
      refId: `adx-${interpolatedQuery}`,
      resultFormat: 'table',
      rawMode: true,
      query: interpolatedQuery,
      database,
    };
  }

  // Used to get the schema directly
  doRequest(url: string, data: any, maxRetries = 1) {
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

  interpolateVariable(value: any, variable) {
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

    const quotedValues = map(value, val => {
      if (typeof value === 'number') {
        return value;
      }

      return "'" + val + "'";
    });
    return quotedValues.join(',');
  }
}
