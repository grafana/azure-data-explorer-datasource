import { AdxColumnSchema, AdxDatabaseSchema, AdxMappedTabledSchema, AdxTableSchema, SchemaMapping } from '../types';
import { AdxDataSource } from '../datasource';
import { cache } from './cache';
import { map } from 'lodash';

const schemaKey = 'AdxSchemaResolver';

export class AdxSchemaResolver {
  constructor(private datasource: AdxDataSource) {}

  private createCacheKey(addition: string): string {
    return `${schemaKey}.${this.datasource.id}.${addition}`;
  }

  async getDatabases(): Promise<AdxDatabaseSchema[]> {
    const schema = await this.datasource.getSchema();

    if (!this.datasource.useSchemaMapping()) {
      return Object.keys(schema.Databases).map(key => schema.Databases[key]);
    }

    const schemaMappingsByDatabase = this.datasource
      .getSchemaMappings()
      .reduce((grouped: Record<string, SchemaMapping[]>, mapping) => {
        if (!Array.isArray(grouped[mapping.database])) {
          grouped[mapping.database] = [];
        }
        grouped[mapping.database].push(mapping);
        return grouped;
      }, {});

    return Object.keys(schema.Databases).map(key => {
      const database = schema.Databases[key];
      const mappings = schemaMappingsByDatabase[key] ?? [];
      const mappingsAsTables = mappings.reduce((record: Record<string, AdxTableSchema>, mapping) => {
        const table: AdxMappedTabledSchema = {
          Name: mapping.value,
          OrderedColumns: [],
          Type: mapping.type,
          Input: mapping.input,
        };
        record[mapping.name] = table;
        return record;
      }, {});

      return {
        ...database,
        Tables: mappingsAsTables,
      };
    });
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
