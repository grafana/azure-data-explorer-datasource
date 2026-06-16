import createMockSchema from 'components/__fixtures__/schema';

import { AdxSchemaMapper } from './AdxSchemaMapper';

describe('getTableOptions', () => {
  const schema = createMockSchema();

  it('will correctly return tables and materialized views', () => {
    const adxSchemaMapper = new AdxSchemaMapper(false, []);
    const opts = adxSchemaMapper.getTableOptions(schema, 'testdb');
    expect(opts).toHaveLength(2);
    expect(opts.map((op) => op.value)).toEqual(['testtable', 'testMaterializedView']);
  });
});
