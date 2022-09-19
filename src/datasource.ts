import {
  DataFrame,
  DataQueryRequest,
  DataSourceInstanceSettings,
  MetricFindValue,
  ScopedVar,
  ScopedVars,
  TimeRange,
} from '@grafana/data';
import { BackendSrv, DataSourceWithBackend, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { firstStringFieldToMetricFindValue } from 'common/responseHelpers';
import { QueryEditorPropertyExpression } from 'components/LegacyQueryEditor/editor/expressions';
import { QueryEditorOperator, QueryEditorPropertyType } from './schema/types';
import { KustoExpressionParser, escapeColumn } from 'KustoExpressionParser';
import { map } from 'lodash';
import { AdxSchemaMapper } from 'schema/AdxSchemaMapper';
import { cache } from 'schema/cache';
import { toPropertyType } from 'schema/mapper';

import { migrateAnnotation } from './migrations/annotation';
import interpolateKustoQuery from './query_builder';
import { DatabaseItem, KustoDatabaseList, ResponseParser } from './response_parser';
import {
  AdxColumnSchema,
  AdxDataSourceOptions,
  AdxSchema,
  AdxSchemaDefinition,
  AutoCompleteQuery,
  defaultQuery,
  EditorMode,
  KustoQuery,
  QueryExpression,
} from './types';

export class AdxDataSource extends DataSourceWithBackend<KustoQuery, AdxDataSourceOptions> {
  private backendSrv: BackendSrv;
  private templateSrv: TemplateSrv;
  private defaultOrFirstDatabase: string;
  private url?: string;
  private expressionParser: KustoExpressionParser;
  private defaultEditorMode: EditorMode;
  private schemaMapper: AdxSchemaMapper;

  constructor(instanceSettings: DataSourceInstanceSettings<AdxDataSourceOptions>) {
    super(instanceSettings);

    const useSchemaMapping = instanceSettings.jsonData.useSchemaMapping ?? false;
    const schemaMapping = instanceSettings.jsonData.schemaMappings ?? [];

    this.backendSrv = getBackendSrv();
    this.templateSrv = getTemplateSrv();
    this.defaultOrFirstDatabase = instanceSettings.jsonData.defaultDatabase;
    this.url = instanceSettings.url;
    this.defaultEditorMode = instanceSettings.jsonData.defaultEditorMode ?? EditorMode.Visual;
    this.schemaMapper = new AdxSchemaMapper(useSchemaMapping, schemaMapping);
    this.expressionParser = new KustoExpressionParser(this.templateSrv);
    this.parseExpression = this.parseExpression.bind(this);
    this.autoCompleteQuery = this.autoCompleteQuery.bind(this);
    this.getSchemaMapper = this.getSchemaMapper.bind(this);
  }

  /**
   * Return true if it should execute
   */
  filterQuery(target: KustoQuery): boolean {
    if (target.hide || !target.query) {
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
    let query = interpolateKustoQuery(
      this.templateSrv.replace(target.query, scopedVars, this.interpolateVariable),
      scopedVars as ScopedVars
    );

    return {
      ...target,
      query,
      database: this.templateSrv.replace(target.database, scopedVars),
    };
  }

  annotations = {
    prepareAnnotation: migrateAnnotation,
  };

  async metricFindQuery(query: string, optionalOptions: any): Promise<MetricFindValue[]> {
    const databasesQuery = query.match(/^databases\(\)/i);
    if (databasesQuery) {
      return this.getDatabases();
    }

    return this.getDefaultOrFirstDatabase()
      .then((database) => this.buildQuery(query, optionalOptions, database))
      .then((query) =>
        this.query({
          targets: [query],
        } as DataQueryRequest<KustoQuery>).toPromise()
      )
      .then((response) => {
        if (response.data && response.data.length) {
          return firstStringFieldToMetricFindValue(response.data[0]);
        }
        return [];
      })
      .catch((err) => {
        console.log('There was an error', err);
        throw err;
      });
  }

  async getDatabases(): Promise<DatabaseItem[]> {
    return this.getResource<KustoDatabaseList>('databases').then((response) => {
      return new ResponseParser().parseDatabases(response);
    });
  }

  async getResource<T = unknown>(path: string): Promise<any> {
    return super.getResource(path);
  }

  async getDefaultOrFirstDatabase(): Promise<string> {
    if (this.defaultOrFirstDatabase) {
      return Promise.resolve(this.defaultOrFirstDatabase);
    }

    return this.getDatabases().then((databases) => {
      this.defaultOrFirstDatabase = databases[0].value;
      return this.defaultOrFirstDatabase;
    });
  }

  async getSchema(refreshCache = false): Promise<AdxSchema> {
    return cache<AdxSchema>(
      `${this.id}.schema.overview`,
      () => this.getResource('schema').then(new ResponseParser().parseSchemaResult),
      refreshCache
    );
  }

  async getFunctionSchema(database: string, targetFunction: string): Promise<AdxColumnSchema[]> {
    const queryParts: string[] = [];
    const take = 'take 50000';

    queryParts.push(targetFunction);
    queryParts.push(take);
    queryParts.push('getschema');

    const query = this.buildQuery(queryParts.join('\n | '), {}, database);
    const response = await this.query({
      targets: [
        {
          ...query,
          querySource: 'schema',
        },
      ],
    } as DataQueryRequest<KustoQuery>).toPromise();

    return functionSchemaParser(response.data as DataFrame[]);
  }

  async getDynamicSchema(
    database: string,
    source: string,
    columns: string[]
  ): Promise<Record<string, AdxColumnSchema[]>> {
    if (!database || !source || !Array.isArray(columns) || columns.length === 0) {
      return {};
    }
    const queryParts: string[] = [];

    const take = 'take 50000';
    const where = `where ${columns.map((column) => `isnotnull(${escapeColumn(column)})`).join(' and ')}`;
    const project = `project ${columns.map((column) => escapeColumn(column)).join(', ')}`;
    const summarize = `summarize ${columns.map((column) => `buildschema(${escapeColumn(column)})`).join(', ')}`;

    queryParts.push(source);
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

  getVariables() {
    return this.templateSrv.getVariables().map((v) => `$${v.name}`);
  }

  // Used for annotations and templage variables
  private buildQuery(query: string, options: any, database: string): KustoQuery {
    if (!options) {
      options = {};
    }
    if (!options.hasOwnProperty('scopedVars')) {
      options.scopedVars = {};
    }

    const replacedQuery = this.templateSrv.replace(query, options.scopedVars, this.interpolateVariable);
    const interpolatedQuery = interpolateKustoQuery(replacedQuery, options.scopedVars);

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
      .catch((error) => {
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

    const quotedValues = map(value, (val) => {
      if (typeof value === 'number') {
        return value;
      }

      return "'" + escapeSpecial(val) + "'";
    });
    return quotedValues.filter((v) => v !== "''").join(',');
  }

  getSchemaMapper(): AdxSchemaMapper {
    return this.schemaMapper;
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

    if (!Array.isArray(response.data[0].fields) || response.data[0].fields.length === 0) {
      return [];
    }

    const results = response.data[0].fields[0].values.toArray();
    const operator: QueryEditorOperator<string> = query.search.operator as QueryEditorOperator<string>; // why is this always T = QueryEditorOperatorValueType

    return operator.name === 'contains' ? sortStartsWithValuesFirst(results, operator.value) : results;
  }
}

const functionSchemaParser = (frames: DataFrame[]): AdxColumnSchema[] => {
  const result: AdxColumnSchema[] = [];
  const fields = frames[0].fields;

  if (!fields) {
    return result;
  }

  const nameIndex = fields.findIndex((f) => f.name === 'ColumnName');
  const typeIndex = fields.findIndex((f) => f.name === 'ColumnType');

  if (nameIndex < 0 || typeIndex < 0) {
    return result;
  }

  for (const frame of frames) {
    for (let index = 0; index < frame.length; index++) {
      result.push({
        Name: frame.fields[nameIndex].values.get(index),
        CslType: frame.fields[typeIndex].values.get(index),
      });
    }
  }

  return result;
};

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

const recordSchemaArray = (name: string, types: AdxSchemaDefinition[], result: AdxColumnSchema[]) => {
  // If a field can have different types (e.g. long and double)
  // we select double if it exists as it's the one with more precision, otherwise we take the first
  const defaultCslType = types.find((t) => typeof t === 'string' && (t === 'double' || t === 'real')) || types[0];
  if (
    types.length > 1 &&
    !types.every((t) => typeof t === 'string' && toPropertyType(t) === QueryEditorPropertyType.Number)
  ) {
    // If there is more than one type and not all types are numbers
    console.warn(`schema ${name} may contain different types, assuming ${defaultCslType}`);
  }
  if (typeof defaultCslType === 'object') {
    recordSchema(name, types[0], result);
  } else {
    result.push({ Name: name, CslType: defaultCslType, isDynamic: true });
  }
};

const recordSchema = (columnName: string, schema: AdxSchemaDefinition, result: AdxColumnSchema[]) => {
  if (!schema) {
    console.log('error with column', columnName);
    return;
  }

  // Case: schema is a single type: e.g. 'long'
  if (typeof schema === 'string') {
    result.push({
      Name: columnName,
      CslType: schema,
      isDynamic: true,
    });
    return;
  }

  // Case: schema is a multiple type: e.g. ['long', 'double']
  if (Array.isArray(schema)) {
    recordSchemaArray(columnName, schema, result);
    return;
  }

  // Case: schema is an object: e.g. {"a": "long"}
  for (const name of Object.keys(schema)) {
    // Generate a valid accessor for a dynamic type
    // https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/scalar-data-types/dynamic#dynamic-object-accessors
    const key = `${columnName}["${name}"]`;
    const subSchema = schema[name];
    recordSchema(key, subSchema, result);
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
