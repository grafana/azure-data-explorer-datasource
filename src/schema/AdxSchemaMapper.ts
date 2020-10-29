import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from '../editor/types';
import { AdxDatabaseSchema, AdxSchema, SchemaMapping, SchemaMappingType } from '../types';
import { tableToDefinition } from './mapper';

export class AdxSchemaMapper {
  private mappingsByDatabase: Record<string, SchemaMapping[]> = {};
  private displayNameToMapping: Record<string, SchemaMapping> = {};
  private nameToMapping: Record<string, SchemaMapping> = {};

  constructor(private enabled = false, mappings: SchemaMapping[] = []) {
    for (const mapping of mappings) {
      if (!Array.isArray(this.mappingsByDatabase[mapping.database])) {
        this.mappingsByDatabase[mapping.database] = [];
      }
      this.mappingsByDatabase[mapping.database].push(mapping);
      this.displayNameToMapping[mapping.displayName] = mapping;
      this.nameToMapping[mapping.name] = mapping;
    }
  }

  getMappingByName(name?: string): SchemaMapping | undefined {
    if (!this.enabled || !name) {
      return;
    }
    return this.nameToMapping[name];
  }

  getTableOptions(schema: AdxSchema, databaseName: string): QueryEditorPropertyDefinition[] {
    const database = schema.Databases[databaseName];

    if (!database || !database.Tables) {
      return [];
    }

    if (!this.enabled) {
      return Object.keys(database.Tables).map(key => {
        const table = database.Tables[name];
        return tableToDefinition(table);
      });
    }

    const mappings = this.mappingsByDatabase[databaseName];
    return filterAndMapToDefinition(database, mappings);
  }
}

const filterAndMapToDefinition = (
  database: AdxDatabaseSchema,
  mappings: SchemaMapping[] = []
): QueryEditorPropertyDefinition[] => {
  return mappings.reduce((all: QueryEditorPropertyDefinition[], mapping) => {
    if (mapping.type === SchemaMappingType.table) {
      if (database.Tables[mapping.name]) {
        all.push(mappingToDefinition(mapping));
        return all;
      }
    }

    if (mapping.type === SchemaMappingType.materializedView) {
      if (database.MaterializedViews[mapping.name]) {
        all.push(mappingToDefinition(mapping));
        return all;
      }
    }

    if (mapping.type === SchemaMappingType.function) {
      if (database.Functions[mapping.name]) {
        all.push(mappingToDefinition(mapping));
        return all;
      }
    }

    return all;
  }, []);
};

const mappingToDefinition = (mapping: SchemaMapping): QueryEditorPropertyDefinition => {
  return {
    type: QueryEditorPropertyType.String,
    label: mapping.displayName,
    value: mapping.name,
  };
};
