import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface KustoQuery extends DataQuery {
  query: string;
  database: string;
  resultFormat: string;
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
