import { getBackendSrv } from '@grafana/runtime';
import { ResponseParser } from '../../response_parser';
import { SchemaMappingOption } from '../../types';

export interface Schema {
  databases: Array<{
    label: string;
    value: string;
  }>;
  schemaMappingOptions: SchemaMappingOption[];
}

export async function refreshSchema(baseUrl: string): Promise<Schema> {
  const databases: Array<{ label: string; value: string }> = [];
  const schemaMappingOptions: SchemaMappingOption[] = [];

  const data = {
    querySource: 'schema',
    csl: `.show databases schema as json`,
  };

  const response = await getBackendSrv().datasourceRequest({
    url: `${baseUrl}/azuredataexplorer/v1/rest/mgmt`,
    method: 'POST',
    data: data,
  });

  // TODO: cache???
  const schema = new ResponseParser().parseSchemaResult(response.data);

  for (const database of Object.values(schema.Databases)) {
    databases.push({
      label: database.Name,
      value: database.Name,
    });

    for (const table of Object.values(database.Tables)) {
      schemaMappingOptions.push({
        type: 'table',
        label: `${database.Name}/tables/${table.Name}`,
        value: table.Name,
        name: table.Name,
        database: database.Name,
      });
    }

    for (const func of Object.values(database.Functions)) {
      schemaMappingOptions.push({
        type: 'function',
        label: `${database.Name}/functions/${func.Name}`,
        value: func.Name,
        name: func.Name,
        input: func.InputParameters,
        database: database.Name,
      });
    }

    for (const view of Object.values(database.MaterializedViews)) {
      schemaMappingOptions.push({
        type: 'materializedView',
        label: `${database.Name}/materializedViews/${view.Name}`,
        value: view.Name,
        name: view.Name,
        database: database.Name,
      });
    }
  }

  return { databases, schemaMappingOptions };
}
