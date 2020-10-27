import { AdxColumnSchema, AdxDatabaseSchema, AdxTableSchema, SchemaMapping, SchemaMappingType } from '../types';
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
    return Object.keys(schema.Databases).map(key => schema.Databases[key]);
  }

  async getTablesForDatabase(databaseName: string): Promise<AdxTableSchema[]> {
    const databases = await this.getDatabases();
    const database = databases.find(db => db.Name === databaseName);
    const schemaMapping = this.datasource.getSchemaMappings();

    if (!database) {
      return [];
    }

    if (schemaMapping.enabled) {
      return filterAndMapTables(database, schemaMapping.mappings);
    }

    const tables = Object.keys(database.Tables).map(key => database.Tables[key]);
    const materializedViews = Object.keys(database.MaterializedViews).map(key => database.MaterializedViews[key]);
    tables.push.apply(tables, materializedViews);

    return tables;
  }

  async getColumnsForTable(databaseName: string, tableName: string): Promise<AdxColumnSchema[]> {
    const cacheKey = this.createCacheKey(`db.${databaseName}.${tableName}`);

    return cache(cacheKey, async () => {
      const tables = await this.getTablesForDatabase(databaseName);
      const table = tables.find(t => t.Name === tableName);
      const schemaMapping = this.datasource.getSchemaMappings();

      if (!table) {
        return [];
      }

      if (schemaMapping.enabled) {
        const mapping = schemaMapping.mappings.find(m => m.displayName === table.Name);

        if (mapping?.type === SchemaMappingType.function) {
          table.OrderedColumns = await this.datasource.getFunctionSchema(databaseName, table.Name);
        }
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

const filterAndMapTables = (database: AdxDatabaseSchema, mappings: SchemaMapping[]): AdxTableSchema[] => {
  return mappings.reduce((tables: AdxTableSchema[], mapping) => {
    if (mapping.database !== database.Name) {
      return tables;
    }

    if (mapping.type === SchemaMappingType.table) {
      if (!database.Tables[mapping.name]) {
        return tables;
      }
      tables.push(database.Tables[mapping.name]);
      return tables;
    }

    if (mapping.type === SchemaMappingType.materializedView) {
      if (!database.MaterializedViews[mapping.name]) {
        return tables;
      }
      tables.push(database.MaterializedViews[mapping.name]);
      return tables;
    }

    if (mapping.name === SchemaMappingType.function) {
      if (!database.Functions[mapping.name]) {
        return tables;
      }
      tables.push({
        Name: mapping.displayName,
        OrderedColumns: [],
      });
      return tables;
    }

    return tables;
  }, []);
};
