import {
  AdxColumnSchema,
  AdxDatabaseSchema,
  AdxFunctionSchema,
  AdxTableSchema,
  SchemaMapping,
  SchemaMappingType,
} from '../types';
import { AdxDataSource } from '../datasource';
import { cache } from './cache';

const schemaKey = 'AdxSchemaResolver';

export class AdxSchemaResolver {
  constructor(private datasource: AdxDataSource) {}

  private createCacheKey(addition: string): string {
    return `${schemaKey}.${this.datasource.id}.${addition}`;
  }

  async getDatabases(): Promise<AdxDatabaseSchema[]> {
    const schema = await this.datasource.getSchema();
    return Object.keys(schema.Databases).map((key) => schema.Databases[key]);
  }

  async getTablesForDatabase(databaseName: string): Promise<AdxTableSchema[]> {
    const databases = await this.getDatabases();
    const database = databases.find((db) => db.Name === databaseName);

    if (!database) {
      return [];
    }
    return Object.keys(database.Tables).map((key) => database.Tables[key]);
  }

  async getViewsForDatabase(databaseName: string): Promise<AdxTableSchema[]> {
    const databases = await this.getDatabases();
    const database = databases.find((db) => db.Name === databaseName);

    if (!database) {
      return [];
    }
    return Object.keys(database.MaterializedViews).map((key) => database.MaterializedViews[key]);
  }

  async getFunctionsForDatabase(databaseName: string): Promise<AdxFunctionSchema[]> {
    const databases = await this.getDatabases();
    const database = databases.find((db) => db.Name === databaseName);

    if (!database) {
      return [];
    }
    return Object.keys(database.Functions).map((key) => database.Functions[key]);
  }

  async getColumnsForTable(databaseName: string, tableName: string): Promise<AdxColumnSchema[]> {
    const cacheKey = this.createCacheKey(`db.${databaseName}.${tableName}`);
    const mapper = this.datasource.getSchemaMapper();

    return cache(cacheKey, async () => {
      const mapping = mapper.getMappingByValue(tableName);
      const schema = await this.findSchema(databaseName, tableName, mapping);

      if (!schema) {
        return [];
      }

      if (mapping?.type === SchemaMappingType.function) {
        schema.OrderedColumns = await this.datasource.getFunctionSchema(databaseName, mapping.value);
      }

      const dynamicColumns = schema.OrderedColumns.filter((column) => column.CslType === 'dynamic').map(
        (column) => column.Name
      );

      const schemaByColumn = await this.datasource.getDynamicSchema(
        databaseName,
        mapping?.name ?? tableName,
        dynamicColumns
      );

      return schema.OrderedColumns.reduce((columns: AdxColumnSchema[], column) => {
        const schemaForDynamicColumn = schemaByColumn[column.Name];

        if (!Array.isArray(schemaForDynamicColumn)) {
          columns.push(column);
          return columns;
        }

        Array.prototype.push.apply(columns, schemaForDynamicColumn);
        return columns;
      }, []);
    });
  }

  private async findSchema(
    databaseName: string,
    tableName: string,
    mapping?: SchemaMapping
  ): Promise<AdxTableSchema | undefined> {
    const [tables, funcs, views] = await Promise.all([
      this.getTablesForDatabase(databaseName),
      this.getFunctionsForDatabase(databaseName),
      this.getViewsForDatabase(databaseName),
    ]);

    const name = mapping?.name ?? tableName;

    const table = tables.find((t) => t.Name === name);
    if (table) {
      return table;
    }

    const view = views.find((v) => v.Name === name);
    if (view) {
      return view;
    }

    const func = funcs.find((f) => f.Name === name);
    if (func) {
      return {
        Name: func.Name,
        OrderedColumns: func.OutputColumns,
      };
    }

    return;
  }
}
