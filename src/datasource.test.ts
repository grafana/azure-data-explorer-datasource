import { AdxDataSource, sortStartsWithValuesFirst } from './datasource';
import { toDataFrame } from '@grafana/data';
import { of } from 'rxjs';
import _ from 'lodash';
import { EditorMode } from 'types';
import { mockDatasource } from 'components/__fixtures__/Datasource';

jest.mock('@grafana/runtime', () => {
  const original = jest.requireActual('@grafana/runtime');
  return {
    ...original,
    getTemplateSrv: () => ({
      getVariables: () => [],
      replace: (s: string) => s,
    }),
  };
});

describe('AdxDataSource', () => {
  const ctx: any = {};

  beforeEach(() => {
    ctx.instanceSettings = {
      url: 'http://kustodb.com',
      jsonData: {},
    };
  });

  describe('when performing getClusters', () => {
    const response = [
      {
        name: 'ClusterName',
        value: 'ClusterValue',
      },
    ];

    beforeEach(() => {
      ctx.ds = new AdxDataSource(ctx.instanceSettings);
      ctx.ds.getResource = jest.fn().mockResolvedValue(response);
    });

    it('should return a list of clusters', () => {
      return ctx.ds.getClusters().then((results) => {
        expect(results[0].name).toBe('ClusterName');
        expect(results[0].value).toBe('ClusterValue');
      });
    });
  });

  describe('when performing getDatabases', () => {
    const response = setupTableResponse();

    beforeEach(() => {
      ctx.ds = new AdxDataSource(ctx.instanceSettings);
      ctx.ds.getResource = jest.fn().mockResolvedValue(response);
      ctx.ds.postResource = jest.fn().mockResolvedValue(response);
    });

    it('should return a list of databases', () => {
      return ctx.ds.getDatabases('clusterUri').then((results) => {
        expect(results[0].text).toBe('Grafana');
        expect(results[0].value).toBe('Grafana');
      });
    });
  });

  describe('when performing getSchema', () => {
    const response = {
      Tables: [
        {
          TableName: 'Table_0',
          Columns: [
            {
              ColumnName: 'DatabaseSchema',
              DataType: 'String',
            },
          ],
          Rows: [
            [
              '{"Plugins":[{"Name":"preview"},{"Name":"pivot"}],' +
                '"Databases":{"Grafana":{"Name":"Grafana","Tables":{"MyLogs":{"Name":"MyLogs",' +
                '"OrderedColumns":[{"Name":"Level","Type":"System.String","CslType":"string"},' +
                '{"Name":"Timestamp","Type":"System.DateTime","CslType":"datetime"},' +
                '{"Name":"UserId","Type":"System.String","CslType":"string"},' +
                '{"Name":"TraceId","Type":"System.String","CslType":"string"},' +
                '{"Name":"Message","Type":"System.String","CslType":"string"},' +
                '{"Name":"ProcessId","Type":"System.Int32","CslType":"int"}]}},' +
                '"MajorVersion":5,"MinorVersion":3,"Functions":{},"DatabaseAccessMode":"ReadWrite"}}}',
            ],
          ],
        },
      ],
    };

    beforeEach(() => {
      ctx.ds = new AdxDataSource(ctx.instanceSettings);
      ctx.ds.getResource = jest.fn().mockResolvedValue(response);
      ctx.ds.postResource = jest.fn().mockResolvedValue(response);
    });

    it('should return a parsed schema', () => {
      return ctx.ds.getSchema('clusterUri').then((result) => {
        expect(Object.keys(result.Databases.Grafana.Tables).length).toBe(1);
        expect(result.Databases.Grafana.Tables.MyLogs.Name).toBe('MyLogs');
      });
    });
  });
});

describe('AdxDataSource', () => {
  describe('when constructing with defaultEditorMode', () => {
    it('then defaultEditorMode should be correct', () => {
      const instanceSettings: any = {
        jsonData: {
          defaultEditorMode: EditorMode.Raw,
        },
      };

      const datasource = new AdxDataSource(instanceSettings);

      expect(datasource.getDefaultEditorMode()).toEqual(EditorMode.Raw);
    });
  });

  describe('when constructing without defaultEditorMode', () => {
    it('then defaultEditorMode should be Visual', () => {
      const instanceSettings: any = {
        jsonData: {},
      };

      const datasource = new AdxDataSource(instanceSettings);

      expect(datasource.getDefaultEditorMode()).toEqual(EditorMode.Visual);
    });
  });

  describe('when getting a dynamic schema', () => {
    it('should return valid accessors', async () => {
      const datasource = mockDatasource();
      datasource.query = jest.fn().mockReturnValue(
        of({
          data: [
            toDataFrame({
              fields: [
                {
                  name: 'schema_Teams',
                  type: 'string',
                  typeInfo: {
                    frame: 'string',
                  },
                  config: {},
                  values: ['{"18":{"TeamID":"long"}}'],
                  entities: {},
                },
              ],
            }),
          ],
        })
      );

      expect(await datasource.getDynamicSchema('foo', 'bar', ['col'], 'cluster')).toEqual({
        Teams: [
          {
            CslType: 'long',
            Name: 'Teams["18"]["TeamID"]',
            isDynamic: true,
          },
        ],
      });
    });

    it('should build a correct query if the column includes a space', async () => {
      const datasource = mockDatasource();
      datasource.query = jest.fn().mockReturnValue(
        of({
          data: [
            toDataFrame({
              fields: [
                {
                  name: 'schema_Teams',
                  type: 'string',
                  typeInfo: {
                    frame: 'string',
                  },
                  config: {},
                  values: ['{"18":{"TeamID":"long"}}'],
                  entities: {},
                },
              ],
            }),
          ],
        })
      );

      expect(await datasource.getDynamicSchema('foo', 'bar', ['col name'], 'cluster')).toEqual({
        Teams: [
          {
            CslType: 'long',
            Name: 'Teams["18"]["TeamID"]',
            isDynamic: true,
          },
        ],
      });
      expect(datasource.query).toHaveBeenCalledTimes(1);
      expect((datasource.query as jest.Mock).mock.calls[0][0].targets[0].query).toEqual(`bar
 | take 50000
 | where isnotnull([\"col name\"])
 | project [\"col name\"]
 | summarize buildschema([\"col name\"])`);
    });

    describe('when there are multiple types returned', () => {
      [
        {
          schema: '{"TeamID":["long","double"]}',
          expected: { Name: `Teams["TeamID"]`, CslType: 'double', isDynamic: true },
        },
        {
          schema: '{"TeamID":["long","real"]}',
          expected: { Name: `Teams["TeamID"]`, CslType: 'real', isDynamic: true },
        },
        {
          schema: '{"TeamID":["long","int"]}',
          expected: { Name: `Teams["TeamID"]`, CslType: 'long', isDynamic: true },
        },
        {
          schema: '{"TeamID":["string","bool"]}',
          expected: { Name: `Teams["TeamID"]`, CslType: 'string', isDynamic: true },
          warn: true,
        },
        {
          schema: '{"TeamID":["string","double"]}',
          expected: { Name: `Teams["TeamID"]`, CslType: 'double', isDynamic: true },
          warn: true,
        },
        {
          schema: '{"TeamID":[{"a":"string"},"bool"]}',
          expected: { Name: `Teams["TeamID"]["a"]`, CslType: 'string', isDynamic: true },
          warn: true,
        },
        { schema: '["long","double"]', expected: { Name: `Teams`, CslType: 'double', isDynamic: true } },
        { schema: '"long"', expected: { Name: `Teams`, CslType: 'long', isDynamic: true } },
      ].forEach((t) => {
        const consoleWarn = console.warn;
        beforeEach(() => {
          console.warn = jest.fn();
        });
        afterEach(() => {
          console.warn = consoleWarn;
        });
        it(`should return ${t.expected.CslType} type for ${t.expected.Name}`, async () => {
          const datasource = mockDatasource();
          datasource.query = jest.fn().mockReturnValue(
            of({
              data: [
                toDataFrame({
                  fields: [
                    {
                      name: 'schema_Teams',
                      type: 'string',
                      typeInfo: { frame: 'string' },
                      config: {},
                      values: [t.schema],
                      entities: {},
                    },
                  ],
                }),
              ],
            })
          );

          expect(await datasource.getDynamicSchema('foo', 'bar', ['col'], 'cluster')).toEqual({
            Teams: [t.expected],
          });
          if (t.warn) {
            expect(console.warn).toBeCalled();
          }
        });
      });
    });
  });
});

describe('sortStartsWithValuesFirst', () => {
  describe('when called with random ordered values', () => {
    it('then should order startsWith values on top followed by values that include searchText', () => {
      const arr = ['South Korea', 'Norway', 'Thailand', 'Taiwan', 'United States', 'Sweden', 'Finland'];
      const searchText = 't';

      const result = sortStartsWithValuesFirst(arr, searchText);

      expect(result).toEqual(['Thailand', 'Taiwan', 'South Korea', 'United States', 'Norway', 'Sweden', 'Finland']);
    });
  });
});

function setupTableResponse() {
  return {
    Tables: [
      {
        TableName: 'Table_0',
        Columns: [
          { ColumnName: 'DatabaseName', DataType: 'String' },
          { ColumnName: 'PersistentStorage', DataType: 'String' },
          { ColumnName: 'Version', DataType: 'String' },
          { ColumnName: 'IsCurrent', DataType: 'Boolean' },
          { ColumnName: 'DatabaseAccessMode', DataType: 'String' },
          { ColumnName: 'PrettyName', DataType: 'String' },
          {
            ColumnName: 'CurrentUserIsUnrestrictedViewer',
            DataType: 'Boolean',
          },
          { ColumnName: 'DatabaseId', DataType: 'Guid' },
        ],
        Rows: [
          [
            'Grafana',
            'https://4bukustoragekus86a3c.blob.core.windows.net/grafanamd201806201624130602',
            'v5.2',
            false,
            'ReadWrite',
            null,
            false,
            '1955a3ed-0668-4d00-a2e5-9c4e610ef057',
          ],
          [
            'Sample',
            'https://4bukustoragekus86a3c.blob.core.windows.net/grafanamd201806201624130602',
            'v5.2',
            false,
            'ReadWrite',
            null,
            false,
            '2955a3ed-0668-4d00-a2e5-9c4e610ef057',
          ],
        ],
      },
    ],
  };
}
