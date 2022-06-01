import { SelectableValue } from '@grafana/data';

import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from '../editor/types';
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

export const columnsToDefinition = (columns: AdxColumnSchema[]): QueryEditorPropertyDefinition[] => {
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns.map((column) => {
    if (column.Name.includes('>')) {
      const groups = column.Name.split('>');
      const colName = groups[0];
      const nestedProps = groups.splice(1).map((p) => `["${p}"]`);
      return {
        label: column.Name.replace(/>/g, ' > '),
        value: `todynamic(${colName})${nestedProps.join('')}`,
        type: toPropertyType(column.CslType),
        dynamic: true,
      };
    }

    return {
      value: column.Name,
      label: column.Name,
      type: toPropertyType(column.CslType),
    };
  });
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
    case 'timespan':
      return QueryEditorPropertyType.TimeSpan;
    default:
      return QueryEditorPropertyType.String;
  }
};
