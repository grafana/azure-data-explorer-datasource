import { DeepPartial } from '@grafana/data/themes/types';
import { AdxSchema } from 'types';

export default function createMockSchema(overrides?: DeepPartial<AdxSchema>) {
  const _mockSchema: DeepPartial<AdxSchema> = {
    Databases: {
      testdb: {
        Name: 'testdb',
        Tables: {
          testtable: {
            Name: 'testtable',
            OrderedColumns: [{ Name: 'column', CslType: 'string', Type: 'System.String' }],
          },
        },
        ExternalTables: {},
        Functions: {
          testfunction: {
            Body: 'Body',
            DocString: 'Doc String',
            FunctionKind: 'scalar',
            InputParameters: [],
            OutputColumns: [],
          },
        },
        MaterializedViews: {
          testMaterializedView: {
            Name: 'testMaterializedView',
            OrderedColumns: [],
          },
        },
      },
    },
    ...overrides,
  };

  const mockSchema = _mockSchema as AdxSchema;
  return mockSchema;
}
