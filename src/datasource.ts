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
  ScopedVars,
} from '@grafana/data';
import { map } from 'lodash';
import { getBackendSrv, BackendSrv, getTemplateSrv, TemplateSrv, DataSourceWithBackend } from '@grafana/runtime';
import { ResponseParser, DatabaseItem } from './response_parser';
import {
  AdxDataSourceOptions,
  KustoQuery,
  AdxSchema,
  AdxColumnSchema,
  defaultQuery,
  QueryExpression,
  EditorMode,
  AutoCompleteQuery,
} from './types';
import { getAnnotationsFromFrame } from './common/annotationsFromFrame';
import interpolateKustoQuery from './query_builder';
import { firstStringFieldToMetricFindValue } from 'common/responseHelpers';
import { QueryEditorPropertyExpression } from 'editor/expressions';
import { QueryEditorOperator } from 'editor/types';
import { cache } from 'schema/cache';
import { KustoExpressionParser } from 'KustoExpressionParser';

export class AdxDataSource extends DataSourceWithBackend<KustoQuery, AdxDataSourceOptions> {
  private backendSrv: BackendSrv;
  private templateSrv: TemplateSrv;
  private baseUrl: string;
  private defaultOrFirstDatabase: string;
  private url?: string;
  private expressionParser: KustoExpressionParser;
  private defaultEditorMode: EditorMode;

  constructor(instanceSettings: DataSourceInstanceSettings<AdxDataSourceOptions>) {
    super(instanceSettings);

    const takeLimit = instanceSettings.jsonData.defaultTakeLimit ?? 10000;
    this.backendSrv = getBackendSrv();
    this.templateSrv = getTemplateSrv();
    this.baseUrl = '/azuredataexplorer';
    this.defaultOrFirstDatabase = instanceSettings.jsonData.defaultDatabase;
    this.url = instanceSettings.url;
    this.expressionParser = new KustoExpressionParser(takeLimit, this.templateSrv);
    this.defaultEditorMode = instanceSettings.jsonData.defaultEditorMode ?? EditorMode.Visual;
    this.parseExpression = this.parseExpression.bind(this);
    this.autoCompleteQuery = this.autoCompleteQuery.bind(this);
  }

  /**
   * Return true if it should execute
   */
  filterQuery(target: KustoQuery): boolean {
    if (target.hide) {
      return false;
    }
    if (typeof target.rawMode === 'undefined' && target.query) {
      return true;
    }
    if (target.rawMode) {
      return true; // anything else we can check
    }

    const tableExpr = target.expression?.from as QueryEditorPropertyExpression;
    if (!tableExpr) {
      return false;
    }

    const table = tableExpr.property?.name;
    if (!table) {
      return false; // Don't execute things without a table selected
    }
    return true;
  }

  applyTemplateVariables(target: KustoQuery, scopedVars: ScopedVar): Record<string, any> {
    let q = interpolateKustoQuery(target.query, scopedVars as ScopedVars);

    return {
      ...target,
      query: this.templateSrv.replace(q, scopedVars, this.interpolateVariable),
      database: this.templateSrv.replace(target.database, scopedVars),
    };
  }

  async annotationQuery(options: AnnotationQueryRequest<KustoQuery>): Promise<AnnotationEvent[]> {
    const query = options.annotation as KustoQuery;
    if (!query) {
      return Promise.reject({
        message: 'Query missing in annotation definition',
      });
    }

    query.resultFormat = 'table';

    return super
      .query({
        targets: [query],
        range: options.range as TimeRange,
        maxDataPoints: 200, // ???
        interval: '10ms',
        intervalMs: 10 * 1000,
      } as DataQueryRequest<KustoQuery>)
      .toPromise()
      .then(res => {
        if (res.state === LoadingState.Done) {
          if (res.data?.length) {
            return getAnnotationsFromFrame(res.data[0] as DataFrame, {
              field: {
                time: 'StartTime',
              },
            });
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

    return this.doRequest(url, req).then((response: any) => {
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
    return cache(`${this.id}.schema.overview`, () => {
      const url = `${this.baseUrl}/v1/rest/mgmt`;
      const req = {
        querySource: 'schema',
        csl: `.show databases schema as json`,
      };

      return this.doRequest(url, req).then(response => {
        return new ResponseParser().parseSchemaResult(response.data);
      });
    });
  }

  async getDynamicSchema(
    database: string,
    table: string,
    columns: string[]
  ): Promise<Record<string, AdxColumnSchema[]>> {
    if (!database || !table || !Array.isArray(columns) || columns.length === 0) {
      return {};
    }
    const queryParts: string[] = [];

    const take = 'take 50000';
    const where = `where ${columns.map(column => `isnotnull(${column})`).join(' and ')}`;
    const project = `project ${columns.map(column => column).join(', ')}`;
    const summarize = `summarize ${columns.map(column => `buildschema(${column})`).join(', ')}`;

    queryParts.push(table);
    queryParts.push(take);
    queryParts.push(where);
    queryParts.push(project);
    queryParts.push(summarize);

    const query = this.buildQuery(queryParts.join('\n | '), {}, database);
    const response = await this.query({
      targets: [
        {
          ...query,
          querySource: 'schema',
        },
      ],
    } as DataQueryRequest<KustoQuery>).toPromise();

    return dynamicSchemaParser(response.data as DataFrame[]);
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

    const interpolatedQuery = interpolateKustoQuery(query, options['scopedVars']);

    return {
      ...defaultQuery,
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

      return "'" + escapeSpecial(val) + "'";
    });
    return quotedValues.filter(v => v !== "''").join(',');
  }

  parseExpression(sections: QueryExpression | undefined, columns: AdxColumnSchema[] | undefined): string {
    return this.expressionParser.toQuery(sections, columns);
  }

  getDefaultEditorMode(): EditorMode {
    return this.defaultEditorMode;
  }

  async autoCompleteQuery(query: AutoCompleteQuery, columns: AdxColumnSchema[] | undefined): Promise<string[]> {
    const autoQuery = this.expressionParser.toAutoCompleteQuery(query, columns);

    if (!autoQuery) {
      return [];
    }

    const kustQuery: KustoQuery = {
      ...defaultQuery,
      refId: `adx-${autoQuery}`,
      database: query.database,
      rawMode: true,
      query: autoQuery,
      resultFormat: 'table',
      querySource: 'autocomplete',
    };

    const response = await this.query(
      includeTimeRange({
        targets: [kustQuery],
      }) as DataQueryRequest<KustoQuery>
    ).toPromise();

    if (!Array.isArray(response?.data) || response.data.length === 0) {
      return [];
    }

    const results = response.data[0].fields[0].values.toArray();
    const operator: QueryEditorOperator<string> = query.search.operator as QueryEditorOperator<string>; // why is this always T = QueryEditorOperatorValueType

    return operator.name === 'contains' ? sortStartsWithValuesFirst(results, operator.value) : results;
  }
}

const dynamicSchemaParser = (frames: DataFrame[]): Record<string, AdxColumnSchema[]> => {
  const result: Record<string, AdxColumnSchema[]> = {};

  for (const frame of frames) {
    for (const field of frame.fields) {
      const json = JSON.parse(field.values.get(0));

      if (json === null) {
        console.log('error with field', field);
        continue;
      }

      const columnSchemas: AdxColumnSchema[] = [];
      const columnName = field.name.replace('schema_', '');
      recordSchema(columnName, json, columnSchemas);
      result[columnName] = columnSchemas;
    }
  }

  return result;
};

const recordSchema = (columnName: string, schema: any, result: AdxColumnSchema[]) => {
  if (!schema) {
    console.log('error with column', columnName);
    return;
  }

  for (const name of Object.keys(schema)) {
    const key = `${columnName}.${name}`;

    if (typeof schema[name] === 'string') {
      result.push({
        Name: key,
        CslType: schema[name],
      });
      continue;
    }

    if (typeof schema[name] === 'object') {
      recordSchema(key, schema[name], result);
    }
  }
};

/**
 * this is a suuuper ugly way of doing this.
 */
const includeTimeRange = (option: any): any => {
  const range = (getTemplateSrv() as any)?.timeRange as TimeRange;

  if (!range) {
    return option;
  }

  return {
    ...option,
    range,
  };
};

const escapeSpecial = (value: string): string => {
  return value.replace(/\'/gim, "\\'");
};

export const sortStartsWithValuesFirst = (arr: string[], searchText: string) => {
  const text = searchText.toLowerCase();

  arr.sort((a, b) => {
    if (!a && !b) {
      return 0;
    }

    if (!a && b) {
      return -1;
    }

    if (a && !b) {
      return 1;
    }

    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    if (aLower.startsWith(text) && bLower.startsWith(text)) {
      return 0;
    }

    if (aLower.startsWith(text) && !bLower.startsWith(text) && bLower.includes(text, 1)) {
      return -1;
    }

    if (aLower.startsWith(text) && !bLower.includes(text, 1)) {
      return -1;
    }

    if (!aLower.startsWith(text) && aLower.includes(text, 1) && bLower.startsWith(text)) {
      return 1;
    }

    if (!aLower.includes(text, 1) && bLower.startsWith(text)) {
      return 1;
    }

    if (aLower.includes(text, 1) && !bLower.includes(text, 1)) {
      return -1;
    }

    if (!aLower.includes(text, 1) && bLower.includes(text, 1)) {
      return 1;
    }

    return 0;
  });

  return arr;
};
