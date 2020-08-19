import { AdxColumnSchema, AdxDatabaseSchema, AdxTableSchema } from '../types';
import { AdxDataSource } from '../datasource';
import { cache } from './cache';

const schemaKey = 'AdxSchemaResolver';

export class AdxSchemaResovler {
  constructor(private datasource: AdxDataSource) {}

  private createCacheKey(addition: string): string {
    return `${schemaKey}.${this.datasource.meta.id}.${addition}`;
  }

  async getDatabases(): Promise<AdxDatabaseSchema[]> {
    const cacheKey = this.createCacheKey('db');
    const schema = await cache(cacheKey, () => this.datasource.getSchema());
    return Object.keys(schema.Databases).map(key => schema.Databases[key]);
  }

  async getTablesForDatabase(databaseName: string): Promise<AdxTableSchema[]> {
    const databases = await this.getDatabases();
    const database = databases.find(db => db.Name === databaseName);

    if (!database) {
      return [];
    }

    return Object.keys(database.Tables).map(key => database.Tables[key]);
  }

  async getColumnsForTable(databaseName: string, tableName: string): Promise<AdxColumnSchema[]> {
    const cacheKey = this.createCacheKey(`db.${databaseName}.${tableName}`);

    return cache(cacheKey, async () => {
      const tables = await this.getTablesForDatabase(databaseName);
      const table = tables.find(t => t.Name === tableName);

      if (!table) {
        return [];
      }

      const dynamicColumns = table.OrderedColumns.filter(column => column.CslType === 'dynamic').map(
        column => column.Name
      );

      const schemaByColumn = await this.datasource.getDynamicSchema(databaseName, tableName, dynamicColumns);

      return table.OrderedColumns.reduce((columns: AdxColumnSchema[], column) => {
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
}
