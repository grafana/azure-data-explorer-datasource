import { SelectableValue } from '@grafana/data';
import { DYNAMIC_TYPE_ARRAY_DELIMITER } from 'KustoExpressionParser';
import { escapeRegExp } from 'lodash';

import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from './types';
import { AdxColumnSchema, AdxDatabaseSchema, AdxTableSchema } from '../types';

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

export const valueToDefinition = (name: string) => {
  return {
    value: name,
    label: name.replace(new RegExp(escapeRegExp(DYNAMIC_TYPE_ARRAY_DELIMITER), 'g'), '[ ]'),
  };
};

export const columnsToDefinition = (columns: AdxColumnSchema[]): QueryEditorPropertyDefinition[] => {
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns.map((column) => {
    return {
      value: column.Name,
      label: column.Name.replace(new RegExp(escapeRegExp(DYNAMIC_TYPE_ARRAY_DELIMITER), 'g'), '[ ]'),
      type: toPropertyType(column.CslType),
    };
  });
};

export const toPropertyType = (kustoType: string): QueryEditorPropertyType => {
  switch (kustoType) {
    case 'real':
    case 'int':
    case 'long':
    case 'double':
    case 'decimal':
      return QueryEditorPropertyType.Number;
    case 'datetime':
      return QueryEditorPropertyType.DateTime;
    case 'bool':
      return QueryEditorPropertyType.Boolean;
    case 'timespan':
      return QueryEditorPropertyType.TimeSpan;
    default:
      return QueryEditorPropertyType.String;
  }
};
