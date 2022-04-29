import { mockDatasource } from 'components/__fixtures__/Datasource';
import createMockSchema from 'components/__fixtures__/schema';

import { AdxSchemaResolver } from './AdxSchemaResolver';

describe('Test schema resolution', () => {
  const datasource = mockDatasource;
  const schemaResolver = new AdxSchemaResolver(datasource);
  const schema = createMockSchema();
  datasource.getSchema = jest.fn().mockResolvedValue(schema);
  datasource.getDynamicSchema = jest.fn().mockResolvedValue([{ Name: 'testprop', CslType: 'string' }]);

  it('Will correctly retrieve databases', async () => {
    const databases = await schemaResolver.getDatabases();
    expect(databases).toHaveLength(1);
    expect(databases[0]).toEqual(schema.Databases['testdb']);
  });

  it('Will correctly retrieve database tables', async () => {
    const tables = await schemaResolver.getTablesForDatabase('testdb');
    expect(tables).toHaveLength(1);
    expect(tables[0]).toEqual(schema.Databases['testdb'].Tables['testtable']);
  });

  it('Will correctly retrieve materialized views', async () => {
    const views = await schemaResolver.getViewsForDatabase('testdb');
    expect(views).toHaveLength(1);
    expect(views[0]).toEqual(schema.Databases['testdb'].MaterializedViews['testMaterializedView']);
  });

  it('Will correctly retrieve functions', async () => {
    const functions = await schemaResolver.getFunctionsForDatabase('testdb');
    expect(functions).toHaveLength(1);
    expect(functions[0]).toEqual(schema.Databases['testdb'].Functions['testfunction']);
  });

  it('Will correctly retrieve table columns', async () => {
    const columns = await schemaResolver.getColumnsForTable('testdb', 'testtable');
    expect(columns).toHaveLength(1);
    expect(columns).toEqual(schema.Databases['testdb'].Tables['testtable'].OrderedColumns);
  });

  it('Will correctly filter out columns with type "dynamic"', async () => {
    const testColumns = [
      { Name: 'boolean', CslType: 'bool', Type: 'System.Boolean' },
      { Name: 'datetime', CslType: 'datetime', Type: 'System.DateTime' },
      { Name: 'dynamic', CslType: 'dynamic', Type: 'System.Object' },
      { Name: 'guid', CslType: 'guid', Type: 'System.Guid' },
      { Name: 'int', CslType: 'int', Type: 'System.Int32' },
      { Name: 'long', CslType: 'long', Type: 'System.Int64' },
      { Name: 'real', CslType: 'real', Type: 'System.Double' },
      { Name: 'string', CslType: 'string', Type: 'System.String' },
      { Name: 'timespan', CslType: 'timespan', Type: 'System.TimeSpan' },
      { Name: 'decimal', CslType: 'decimal', Type: 'System.Data.SqlTypes.SqlDecimal' },
    ];
    schema.Databases['testdb'].Tables = {
      ...schema.Databases['testdb'].Tables,
      ...{
        testdynamictable: {
          Name: 'testdynamictable',
          OrderedColumns: testColumns,
        },
      },
    };
    const columns = await schemaResolver.getColumnsForTable('testdb', 'testdynamictable');
    expect(columns).toHaveLength(testColumns.length - 1);
    expect(columns).not.toContain({ Name: 'dynamic', CslType: 'dynamic', Type: 'System.Object' });
  });
});
