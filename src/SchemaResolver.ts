import { AdxDataSource } from './datasource';
import { AdxColumnSchema } from 'types';
import { QueryEditorFieldDefinition, QueryEditorPropertyType } from 'editor/types';

export class AdxSchemaResolver {
  private databases: QueryEditorFieldDefinition[];
  private tablesByDatabase: Record<string, QueryEditorFieldDefinition[]>;
  private columnsByTable: Record<string, QueryEditorFieldDefinition[]>;
  private dynamicByColumn: Record<string, AdxColumnSchema>;
  private isCached: boolean;

  constructor(private datasource: AdxDataSource) {
    this.databases = [];
    this.tablesByDatabase = {};
    this.columnsByTable = {};
    this.dynamicByColumn = {};
    this.isCached = false;
  }

  getDatabases(): QueryEditorFieldDefinition[] {
    return this.databases || [];
  }

  getTablesForDatabase(database: string): QueryEditorFieldDefinition[] {
    return this.tablesByDatabase[database] ?? [];
  }

  getColumnsForTable(database: string, table: string): QueryEditorFieldDefinition[] {
    const key = columnsKey(database, table);
    return this.columnsByTable[key] ?? [];
  }

  getColumnType(databse: string, table: string, column: string): string | undefined {
    const key = `${databse}.${table}.${column}`;
    return this.dynamicByColumn[key]?.CslType;
  }

  async resolveAndCacheSchema(): Promise<void> {
    if (this.isCached) {
      return;
    }

    try {
      const schema = await this.datasource.getSchema();

      for (const databaseName of Object.keys(schema.Databases)) {
        const db = schema.Databases[databaseName];

        this.databases.push({
          type: QueryEditorPropertyType.String,
          value: databaseName,
          label: databaseName,
        });

        for (const tableName of Object.keys(db.Tables)) {
          const table = db.Tables[tableName];

          if (!this.tablesByDatabase[databaseName]) {
            this.tablesByDatabase[databaseName] = [];
          }

          this.tablesByDatabase[databaseName].push({
            type: QueryEditorPropertyType.String,
            value: tableName,
            label: tableName,
          });

          const schemaForDynamicColumns = await this.getDynamicSchema(databaseName, tableName, table.OrderedColumns);

          for (const column of table.OrderedColumns) {
            const key = columnsKey(databaseName, tableName);

            if (!this.columnsByTable[key]) {
              this.columnsByTable[key] = [];
            }

            if (schemaForDynamicColumns[column.Name]) {
              const flattened = schemaForDynamicColumns[column.Name];
              const columns = this.columnsByTable[key];
              columns.push.apply(columns, flattened);
              continue;
            }

            this.columnsByTable[key].push({
              type: toExpressionType(column.CslType),
              value: column.Name,
            });
          }
        }
      }
      this.isCached = true;
    } catch (error) {
      console.error('[ADX] could not load schema:', error);
    }
  }

  private async getDynamicSchema(
    database: string,
    table: string,
    columns: AdxColumnSchema[]
  ): Promise<Record<string, QueryEditorFieldDefinition[]>> {
    const dynamicColumns = columns.filter(column => isDynamic(column)).map(column => column.Name);

    if (dynamicColumns.length === 0) {
      return {};
    }

    try {
      const schemasByColumn = await this.datasource.getDynamicSchema(database, table, dynamicColumns);
      const result: Record<string, QueryEditorFieldDefinition[]> = {};

      for (const columnName of Object.keys(schemasByColumn)) {
        for (const schema of schemasByColumn[columnName]) {
          if (!result[columnName]) {
            result[columnName] = [];
          }

          result[columnName].push({
            type: toExpressionType(schema.CslType),
            value: schema.Name,
          });

          const key = `${database}.${table}.${schema.Name}`;
          this.dynamicByColumn[key] = schema;
        }
      }

      return result;
    } catch (error) {
      return {};
    }
  }
}

const isDynamic = (column: AdxColumnSchema): boolean => {
  return column.CslType === 'dynamic';
};

const columnsKey = (database: string, table: string): string => {
  return `${database}.${table}`;
};

const toExpressionType = (kustoType: string): QueryEditorPropertyType => {
  // System.Object -> should do a lookup on those fields to flatten out their schema.

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
