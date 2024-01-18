import { AdxDataSource } from 'datasource';
import { SchemaMappingOption, SchemaMappingType } from '../../types';

export interface Schema {
  databases: Array<{
    label: string;
    value: string;
  }>;
  schemaMappingOptions: SchemaMappingOption[];
}

export async function refreshSchema(datasource: AdxDataSource): Promise<Schema> {
  const databases: Array<{ label: string; value: string }> = [];
  const schemaMappingOptions: SchemaMappingOption[] = [];

  const schema = await datasource.getSchema('');
  for (const database of Object.values(schema.Databases)) {
    databases.push({
      label: database.Name,
      value: database.Name,
    });

    for (const table of Object.values(database.Tables)) {
      schemaMappingOptions.push({
        type: SchemaMappingType.table,
        label: `${database.Name}/tables/${table.Name}`,
        value: table.Name,
        name: table.Name,
        database: database.Name,
      });
    }

    for (const func of Object.values(database.Functions)) {
      schemaMappingOptions.push({
        type: SchemaMappingType.function,
        label: `${database.Name}/functions/${func.Name}`,
        value: func.Name,
        name: func.Name,
        input: func.InputParameters,
        database: database.Name,
      });
    }

    for (const view of Object.values(database.MaterializedViews)) {
      schemaMappingOptions.push({
        type: SchemaMappingType.materializedView,
        label: `${database.Name}/materializedViews/${view.Name}`,
        value: view.Name,
        name: view.Name,
        database: database.Name,
      });
    }
  }

  return { databases, schemaMappingOptions };
}
