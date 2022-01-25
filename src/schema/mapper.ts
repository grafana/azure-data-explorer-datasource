import { AdxTableSchema, AdxColumnSchema, AdxDatabaseSchema } from '../types';
import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from '../editor/types';
import { SelectableValue } from '@grafana/data';

export const tableToDefinition = (table: AdxTableSchema): QueryEditorPropertyDefinition => {
  return {
    label: table.Name,
    value: table.Name,
    type: QueryEditorPropertyType.String,
  };
};

export const tableToSelectable = (table: AdxTableSchema): SelectableValue<string> => {
  return {
    label: table.Name,
    value: table.Name,
  };
};

export const databaseToDefinition = (database: AdxDatabaseSchema): QueryEditorPropertyDefinition => {
  return {
    value: database.Name,
    label: database.Name,
    type: QueryEditorPropertyType.String,
  };
};

export const databasesToDefinition = (databases: AdxDatabaseSchema[]): QueryEditorPropertyDefinition[] => {
  if (!Array.isArray(databases)) {
    return [];
  }
  return databases.map(databaseToDefinition);
};

export const tablesToDefinition = (tables: AdxTableSchema[]): QueryEditorPropertyDefinition[] => {
  if (!Array.isArray(tables)) {
    return [];
  }

  return tables.map((table) => ({
    value: table.Name,
    label: table.Name,
    type: QueryEditorPropertyType.String,
  }));
};

export const columnsToDefinition = (columns: AdxColumnSchema[]): QueryEditorPropertyDefinition[] => {
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns.map((column) => ({
    value: column.Name,
    label: column.Name,
    type: toPropertyType(column.CslType),
  }));
};

const toPropertyType = (kustoType: string): QueryEditorPropertyType => {
  switch (kustoType) {
    case 'real':
    case 'int':
    case 'long':
      return QueryEditorPropertyType.Number;
    case 'datetime':
      return QueryEditorPropertyType.DateTime;
    case 'bool':
      return QueryEditorPropertyType.Boolean;
    default:
      return QueryEditorPropertyType.String;
  }
};
