import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from './types';
import { AdxDatabaseSchema, AdxSchema, SchemaMapping, SchemaMappingType } from '../types';
import { tableToDefinition } from './mapper';

// Mappings in the jsonData are partials - they might have undefined fields. We want to ignore them.
const validMapping = (mapping: Partial<SchemaMapping>): mapping is SchemaMapping => {
  return (
    Object.values(mapping).every((v) => v !== undefined) &&
    !!mapping.database &&
    !!mapping.displayName &&
    !!mapping.name &&
    !!mapping.type &&
    !!mapping.value
  );
};

export class AdxSchemaMapper {
  private mappingsByDatabase: Record<string, SchemaMapping[]> = {};
  private displayNameToMapping: Record<string, SchemaMapping> = {};
  private nameToMapping: Record<string, SchemaMapping> = {};
  private valueToMapping: Record<string, SchemaMapping> = {};

  constructor(
    private enabled = false,
    mappings: Array<Partial<SchemaMapping>> = []
  ) {
    for (const mapping of mappings) {
      // Skip mappings with empty values
      if (!validMapping(mapping)) {
        continue;
      }

      if (!Array.isArray(this.mappingsByDatabase[mapping.database])) {
        this.mappingsByDatabase[mapping.database] = [];
      }
      this.mappingsByDatabase[mapping.database].push(mapping);
      this.displayNameToMapping[mapping.displayName] = mapping;
      this.nameToMapping[mapping.name] = mapping;
      this.valueToMapping[mapping.value] = mapping;
    }
  }

  getMappingByValue(value?: string): SchemaMapping | undefined {
    if (!this.enabled || !value) {
      return;
    }
    return this.valueToMapping[value];
  }

  getTableOptions(schema: AdxSchema, databaseName: string): QueryEditorPropertyDefinition[] {
    const database = schema.Databases[databaseName];

    if (!database || !database.Tables) {
      return [];
    }

    if (!this.enabled) {
      const tables = Object.keys(database.Tables).map((key) => {
        const table = database.Tables[key];
        return tableToDefinition(table);
      });
      const materializedViews = Object.keys(database.MaterializedViews).map((key) => {
        const table = database.MaterializedViews[key];
        return tableToDefinition(table);
      });
      return tables.concat(materializedViews);
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
        console.log('if (database.Tables[mapping.name])', mapping);
        all.push(mappingToDefinition(mapping));
        return all;
      }
    }

    if (mapping.type === SchemaMappingType.materializedView) {
      if (database.MaterializedViews[mapping.name]) {
        console.log('if (database.MaterializedViews[mapping.name])', mapping);
        all.push(mappingToDefinition(mapping));
        return all;
      }
    }

    if (mapping.type === SchemaMappingType.function) {
      if (database.Functions[mapping.name]) {
        console.log('if (database.Functions[mapping.name])', mapping);
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
    value: mapping.value,
  };
};
