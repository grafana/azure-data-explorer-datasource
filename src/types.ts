import { DataQuery, DataSourceJsonData } from '@grafana/data';

export enum QueryEditorExpressionType {
  Field = 'field',
  Conditional = 'conditional',
  Operator = 'operator',
  FieldAndOperator = 'fieldAndOperator',
  OperatorRepeater = 'operatorRepeater',
  Reduce = 'reduce',
  FunctionParameter = 'functionParameter',
  GroupBy = 'groupBy',
}

export interface QueryEditorExpression {
  type: QueryEditorExpressionType;
}

export interface QueryEditorSectionExpression {
  id: string;
  expression?: QueryEditorExpression;
}

export interface QueryExpression {
  from?: QueryEditorSectionExpression;
  where?: QueryEditorSectionExpression;
  reduce?: QueryEditorSectionExpression;
  groupBy?: QueryEditorSectionExpression;
}

export interface KustoQuery extends DataQuery {
  query: string;
  database: string;
  alias?: string;
  resultFormat: string;
  expression?: QueryExpression;
  rawMode?: boolean;
}

export const defaultQuery: Partial<KustoQuery> = {
  query: '',
};

export interface AdxDataSourceOptions extends DataSourceJsonData {
  defaultDatabase: string;
  minimalCache: number;
}

export interface AdxSchema {
  Databases: Record<string, AdxDatabaseSchema>;
}

export interface AdxDatabaseSchema {
  Name: string;
  Tables: Record<string, AdxTableSchema>;
  ExternalTables: Record<string, AdxTableSchema>;
}

export interface AdxTableSchema {
  Name: string;
  OrderedColumns: AdxColumnSchema[];
}

export interface AdxColumnSchema {
  Name: string;
  Type: string;
}
