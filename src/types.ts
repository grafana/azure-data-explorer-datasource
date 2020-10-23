const packageJson = require('../package.json');

import { DataQuery, DataSourceJsonData } from '@grafana/data';
import {
  QueryEditorPropertyExpression,
  QueryEditorArrayExpression,
  QueryEditorExpressionType,
  QueryEditorOperatorExpression,
} from './editor/expressions';

export interface QueryExpression {
  from?: QueryEditorPropertyExpression;
  where: QueryEditorArrayExpression;
  reduce: QueryEditorArrayExpression;
  groupBy: QueryEditorArrayExpression;
  timeshift?: QueryEditorPropertyExpression;
}

type QuerySource = 'raw' | 'schema' | 'autocomplete' | 'visual';
export interface KustoQuery extends DataQuery {
  query: string;
  database: string;
  alias?: string;
  resultFormat: string;
  expression: QueryExpression;
  rawMode?: boolean;
  querySource: QuerySource;
  pluginVersion: string;
}

export interface AutoCompleteQuery {
  database: string;
  search: QueryEditorOperatorExpression;
  expression: QueryExpression;
  index: string;
}

export enum EditorMode {
  Visual = 'visual',
  Raw = 'raw',
}

export const defaultQuery: Pick<KustoQuery, 'query' | 'expression' | 'querySource' | 'pluginVersion'> = {
  query: '',
  querySource: EditorMode.Raw,
  expression: {
    where: {
      type: QueryEditorExpressionType.And,
      expressions: [],
    },
    groupBy: {
      type: QueryEditorExpressionType.And,
      expressions: [],
    },
    reduce: {
      type: QueryEditorExpressionType.And,
      expressions: [],
    },
  },
  pluginVersion: packageJson.version,
};

export interface SchemaMapping {
  database: string;
  type: SchemaMappingType;
  name: string;
  value: string;
  input: SchemaInputMapping[];
}

export enum SchemaMappingType {
  function = 'function',
  table = 'table',
}
export interface SchemaInputMapping {
  name: String;
  value: String;
}

export interface AdxDataSourceOptions extends DataSourceJsonData {
  defaultDatabase: string;
  minimalCache: number;
  defaultEditorMode: EditorMode;
  dataConsistency: string;
  cacheMaxAge: string;
  dynamicCaching: boolean;
  useSchemaMapping: boolean;
  schemaMappings: SchemaMapping[];
}

export interface AdxSchema {
  Databases: Record<string, AdxDatabaseSchema>;
}

export interface AdxDatabaseSchema {
  Name: string;
  Tables: Record<string, AdxTableSchema>;
  ExternalTables: Record<string, AdxTableSchema>;
  Functions: Record<string, AdxFunctionSchema>;
}

export interface AdxTableSchema {
  Name: string;
  OrderedColumns: AdxColumnSchema[];
}

export interface AdxMappedTabledSchema extends AdxTableSchema {
  Type: SchemaMappingType;
  Input: SchemaInputMapping[];
}

export interface AdxColumnSchema {
  Name: string;
  CslType: string;
}

export interface AdxFunctionSchema {
  Body: string;
  FunctionKind: string;
  Name: string;
  InputParameters: AdxFunctionInputParameterSchema[];
  OutputColumns: AdxColumnSchema[];
}

export interface AdxFunctionInputParameterSchema extends AdxColumnSchema {}
