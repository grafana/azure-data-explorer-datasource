import { mockDatasource } from 'components/__fixtures__/Datasource';
import createMockSchema from 'components/__fixtures__/schema';

import { AdxSchemaResolver } from './AdxSchemaResolver';

describe('Test schema resolution', () => {
  const datasource = mockDatasource();
  const schemaResolver = new AdxSchemaResolver(datasource);
  const schema = createMockSchema();

  beforeEach(() => {
    datasource.getSchema = jest.fn().mockResolvedValue(schema);
    datasource.getDynamicSchema = jest.fn().mockResolvedValue([{ Name: 'testprop', CslType: 'string' }]);
  });

  it('Will correctly retrieve databases', async () => {
    const databases = await schemaResolver.getDatabases('testClusterUri');
    expect(databases).toHaveLength(1);
    expect(databases[0]).toEqual(schema.Databases['testdb']);
  });

  it('Will correctly retrieve database tables', async () => {
    const tables = await schemaResolver.getTablesForDatabase('testdb', 'testClusterUri');
    expect(tables).toHaveLength(1);
    expect(tables[0]).toEqual(schema.Databases['testdb'].Tables['testtable']);
  });

  it('Will correctly retrieve materialized views', async () => {
    const views = await schemaResolver.getViewsForDatabase('testdb', 'testClusterUri');
    expect(views).toHaveLength(1);
    expect(views[0]).toEqual(schema.Databases['testdb'].MaterializedViews['testMaterializedView']);
  });

  it('Will correctly retrieve functions', async () => {
    const functions = await schemaResolver.getFunctionsForDatabase('testdb', 'testClusterUri');
    expect(functions).toHaveLength(1);
    expect(functions[0]).toEqual(schema.Databases['testdb'].Functions['testfunction']);
  });

  it('Will correctly retrieve table columns', async () => {
    const columns = await schemaResolver.getColumnsForTable('testdb', 'testtable', 'cluster');
    expect(columns).toHaveLength(1);
    expect(columns).toEqual(schema.Databases['testdb'].Tables['testtable'].OrderedColumns);
  });

  it('Will correctly include columns with type "dynamic" and containing arrays', async () => {
    const testColumns = [
      { Name: 'boolean', CslType: 'bool', Type: 'System.Boolean' },
      { Name: 'datetime', CslType: 'datetime', Type: 'System.DateTime' },
      { Name: 'guid', CslType: 'guid', Type: 'System.Guid' },
      { Name: 'int', CslType: 'int', Type: 'System.Int32' },
      { Name: 'long', CslType: 'long', Type: 'System.Int64' },
      { Name: 'real', CslType: 'real', Type: 'System.Double' },
      { Name: 'string', CslType: 'string', Type: 'System.String' },
      { Name: 'timespan', CslType: 'timespan', Type: 'System.TimeSpan' },
      { Name: 'decimal', CslType: 'decimal', Type: 'System.Data.SqlTypes.SqlDecimal' },
      // Dynamic column
      { Name: 'dynamic', CslType: 'dynamic', Type: 'System.Object' },
    ];
    datasource.getDynamicSchema = jest.fn().mockResolvedValue({
      dynamic: [{ Name: 'Modes["`indexer`"]', CslType: 'string', Type: 'dynamic' }],
    });
    const schema = createMockSchema();
    schema.Databases['testdb'].Tables = {
      ...schema.Databases['testdb'].Tables,
      ...{
        testdynamictable: {
          Name: 'testdynamictable',
          OrderedColumns: testColumns,
        },
      },
    };
    datasource.getSchema = jest.fn().mockResolvedValue(schema);
    const columns = await schemaResolver.getColumnsForTable('testdb', 'testdynamictable', 'cluster');
    expect(columns).toHaveLength(testColumns.length);
    expect(columns).toEqual(
      expect.arrayContaining([{ CslType: 'string', Name: 'Modes["`indexer`"]', Type: 'dynamic' }])
    );
  });

  it('Will correctly include columns with type "dynamic" and containing nested arrays', async () => {
    const testColumns = [
      { Name: 'boolean', CslType: 'bool', Type: 'System.Boolean' },
      { Name: 'datetime', CslType: 'datetime', Type: 'System.DateTime' },
      { Name: 'guid', CslType: 'guid', Type: 'System.Guid' },
      { Name: 'int', CslType: 'int', Type: 'System.Int32' },
      { Name: 'long', CslType: 'long', Type: 'System.Int64' },
      { Name: 'real', CslType: 'real', Type: 'System.Double' },
      { Name: 'string', CslType: 'string', Type: 'System.String' },
      { Name: 'timespan', CslType: 'timespan', Type: 'System.TimeSpan' },
      { Name: 'decimal', CslType: 'decimal', Type: 'System.Data.SqlTypes.SqlDecimal' },
      // Dynamic column
      { Name: 'dynamic', CslType: 'dynamic', Type: 'System.Object' },
    ];
    datasource.getDynamicSchema = jest.fn().mockResolvedValue({
      dynamic: [{ Name: 'Modes["`indexer`"]["`indexer`"]', CslType: 'string' }],
    });
    const schema = createMockSchema();
    schema.Databases['testdb'].Tables = {
      ...schema.Databases['testdb'].Tables,
      ...{
        testdynamictable: {
          Name: 'testdynamictable',
          OrderedColumns: testColumns,
        },
      },
    };
    datasource.getSchema = jest.fn().mockResolvedValue(schema);
    const columns = await schemaResolver.getColumnsForTable('testdb', 'testdynamictable', 'cluster');
    expect(columns).toHaveLength(testColumns.length);
    expect(columns).toEqual(
      expect.arrayContaining([{ CslType: 'string', Name: 'Modes["`indexer`"]', Type: 'dynamic' }])
    );
  });

  it('Will correctly include columns with type "dynamic" and simple properties', async () => {
    const testColumns = [
      { Name: 'boolean', CslType: 'bool', Type: 'System.Boolean' },
      { Name: 'datetime', CslType: 'datetime', Type: 'System.DateTime' },
      { Name: 'guid', CslType: 'guid', Type: 'System.Guid' },
      { Name: 'int', CslType: 'int', Type: 'System.Int32' },
      { Name: 'long', CslType: 'long', Type: 'System.Int64' },
      { Name: 'real', CslType: 'real', Type: 'System.Double' },
      { Name: 'string', CslType: 'string', Type: 'System.String' },
      { Name: 'timespan', CslType: 'timespan', Type: 'System.TimeSpan' },
      { Name: 'decimal', CslType: 'decimal', Type: 'System.Data.SqlTypes.SqlDecimal' },
      // Dynamic column
      { Name: 'dynamic', CslType: 'dynamic', Type: 'System.Object' },
    ];
    datasource.getDynamicSchema = jest.fn().mockResolvedValue({
      dynamic: [{ Name: 'Teams["Score"]', CslType: 'long' }],
    });
    const schema = createMockSchema();
    schema.Databases['testdb'].Tables = {
      ...schema.Databases['testdb'].Tables,
      ...{
        testdynamictableobj: {
          Name: 'testdynamictableobj',
          OrderedColumns: testColumns,
        },
      },
    };
    datasource.getSchema = jest.fn().mockResolvedValue(schema);
    const columns = await schemaResolver.getColumnsForTable('testdb', 'testdynamictableobj', 'cluster');
    expect(columns).toHaveLength(testColumns.length);
    expect(columns).toEqual(expect.arrayContaining([{ CslType: 'long', Name: 'Teams["Score"]' }]));
  });
});
