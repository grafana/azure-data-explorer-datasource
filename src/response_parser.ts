import { SelectableValue } from '@grafana/data';
import { AdxSchema, ClusterOption } from 'types';

export interface DataTarget {
  target: string;
  datapoints: any[];
  refId: string;
  query: any;
}

export interface TableResult {
  columns: TableColumn[];
  rows: any[];
  type: string;
  refId: string;
  query: string;
}

export interface TableColumn {
  text: string;
  type: string;
}

export interface Variable {
  text: string;
  value: string;
}

// API interfaces
export interface KustoDatabaseList {
  Tables: KustoDatabaseItem[];
}

export interface KustoDatabaseItem {
  TableName: string;
  Columns: any[];
  Rows: any[];
}

export interface KustoDatabase {
  Name: string;
  Tables: { [key: string]: KustoTable };
  Functions: { [key: string]: KustoFunction };
}

export interface KustoTable {
  Name: string;
  OrderedColumns: KustoColumn[];
}

export interface KustoColumn {
  Name: string;
  Type: string;
}

export interface KustoFunction {
  Name: string;
  DocString: string;
  Body: string;
  Folder: string;
  FunctionKind: string;
  InputParameters: any[];
  OutputColumns: any[];
}

// Internal interfaces
export interface DatabaseItem {
  text: string;
  value: string;
}

export class ResponseParser {
  parseDatabases(results: KustoDatabaseList): DatabaseItem[] {
    const databases: DatabaseItem[] = [];
    if (!results) {
      return databases;
    }

    for (const table of results.Tables) {
      for (const row of table.Rows) {
        databases.push({ text: row[5] || row[0], value: row[0] });
      }
    }

    return databases;
  }

  parseSchemaResult(results: any) {
    const schemaJson = results.Tables[0].Rows[0][0];
    return JSON.parse(schemaJson) as AdxSchema;
  }

  parseOpenAIResponse(results: any) {
    const content = results.choices[0].Message.Content;
    return content;
  }
}

export const parseClustersResponse = (res: ClusterOption[], giveNames = true): SelectableValue[] => {
  if (!res || res.length === 0) {
    return [];
  }
  return res.map((val: ClusterOption) => ({ label: giveNames ? val.name : val.uri, value: val.uri }));
};
