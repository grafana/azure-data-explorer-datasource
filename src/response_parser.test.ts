import { ClusterOption } from 'types';
import { KustoDatabaseList, ResponseParser, parseClustersResponse } from './response_parser';

describe('ResponseParser', () => {
  let parser: ResponseParser;

  beforeEach(() => {
    parser = new ResponseParser();
  });

  describe('parseDatabases', () => {
    it('should parse database list with full row data', () => {
      const mockResults: KustoDatabaseList = {
        Tables: [
          {
            TableName: 'Table_0',
            Columns: [],
            Rows: [
              ['db1', 'field1', 'field2', 'field3', 'field4', 'Database One'],
              ['db2', 'field1', 'field2', 'field3', 'field4', 'Database Two'],
              ['db3', 'field1', 'field2', 'field3', 'field4', 'Database Three'],
            ],
          },
        ],
      };

      const result = parser.parseDatabases(mockResults);

      expect(result).toEqual([
        { text: 'Database One', value: 'db1' },
        { text: 'Database Two', value: 'db2' },
        { text: 'Database Three', value: 'db3' },
      ]);
    });

    it('should use first column as text when sixth column is empty', () => {
      const mockResults: KustoDatabaseList = {
        Tables: [
          {
            TableName: 'Table_0',
            Columns: [],
            Rows: [
              ['db1', 'field1', 'field2', 'field3', 'field4', ''],
              ['db2', 'field1', 'field2', 'field3', 'field4', null],
              ['db3', 'field1', 'field2', 'field3', 'field4', undefined],
            ],
          },
        ],
      };

      const result = parser.parseDatabases(mockResults);

      expect(result).toEqual([
        { text: 'db1', value: 'db1' },
        { text: 'db2', value: 'db2' },
        { text: 'db3', value: 'db3' },
      ]);
    });

    it('should handle multiple tables', () => {
      const mockResults: KustoDatabaseList = {
        Tables: [
          {
            TableName: 'Table_0',
            Columns: [],
            Rows: [['db1', 'field1', 'field2', 'field3', 'field4', 'Database One']],
          },
          {
            TableName: 'Table_1',
            Columns: [],
            Rows: [['db2', 'field1', 'field2', 'field3', 'field4', 'Database Two']],
          },
        ],
      };

      const result = parser.parseDatabases(mockResults);

      expect(result).toEqual([
        { text: 'Database One', value: 'db1' },
        { text: 'Database Two', value: 'db2' },
      ]);
    });

    it('should return empty array when results are undefined', () => {
      const result = parser.parseDatabases(undefined as any);
      expect(result).toEqual([]);
    });

    it('should handle empty tables array', () => {
      const mockResults: KustoDatabaseList = {
        Tables: [],
      };

      const result = parser.parseDatabases(mockResults);
      expect(result).toEqual([]);
    });

    it('should handle tables with empty rows', () => {
      const mockResults: KustoDatabaseList = {
        Tables: [
          {
            TableName: 'Table_0',
            Columns: [],
            Rows: [],
          },
        ],
      };

      const result = parser.parseDatabases(mockResults);
      expect(result).toEqual([]);
    });
  });
});

describe('parseClustersResponse', () => {
  it('should parse cluster options with names', () => {
    const mockClusters: ClusterOption[] = [
      { name: 'Cluster 1', uri: 'https://cluster1.kusto.windows.net' },
      { name: 'Cluster 2', uri: 'https://cluster2.kusto.windows.net' },
      { name: 'Cluster 3', uri: 'https://cluster3.kusto.windows.net' },
    ];

    const result = parseClustersResponse(mockClusters, true);

    expect(result).toEqual([
      { label: 'Cluster 1', value: 'https://cluster1.kusto.windows.net' },
      { label: 'Cluster 2', value: 'https://cluster2.kusto.windows.net' },
      { label: 'Cluster 3', value: 'https://cluster3.kusto.windows.net' },
    ]);
  });

  it('should parse cluster options with URIs as labels when giveNames is false', () => {
    const mockClusters: ClusterOption[] = [
      { name: 'Cluster 1', uri: 'https://cluster1.kusto.windows.net' },
      { name: 'Cluster 2', uri: 'https://cluster2.kusto.windows.net' },
    ];

    const result = parseClustersResponse(mockClusters, false);

    expect(result).toEqual([
      { label: 'https://cluster1.kusto.windows.net', value: 'https://cluster1.kusto.windows.net' },
      { label: 'https://cluster2.kusto.windows.net', value: 'https://cluster2.kusto.windows.net' },
    ]);
  });

  it('should return empty array for undefined input', () => {
    const result = parseClustersResponse(undefined as any, true);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty input array', () => {
    const result = parseClustersResponse([], true);
    expect(result).toEqual([]);
  });

  it('should add clusterUri if not present in results', () => {
    const mockClusters: ClusterOption[] = [{ name: 'Cluster 1', uri: 'https://cluster1.kusto.windows.net' }];

    const result = parseClustersResponse(mockClusters, true, 'https://custom-cluster.kusto.windows.net');

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      label: 'Cluster 1',
      value: 'https://cluster1.kusto.windows.net',
    });
    expect(result).toContainEqual({
      label: 'https://custom-cluster.kusto.windows.net',
      value: 'https://custom-cluster.kusto.windows.net',
    });
  });

  it('should not duplicate clusterUri if already present in results', () => {
    const mockClusters: ClusterOption[] = [
      { name: 'Cluster 1', uri: 'https://cluster1.kusto.windows.net' },
      { name: 'Custom Cluster', uri: 'https://custom-cluster.kusto.windows.net' },
    ];

    const result = parseClustersResponse(mockClusters, true, 'https://custom-cluster.kusto.windows.net');

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { label: 'Cluster 1', value: 'https://cluster1.kusto.windows.net' },
      { label: 'Custom Cluster', value: 'https://custom-cluster.kusto.windows.net' },
    ]);
  });

  it('should add clusterUri to empty results', () => {
    const result = parseClustersResponse([], true, 'https://custom-cluster.kusto.windows.net');

    expect(result).toEqual([
      { label: 'https://custom-cluster.kusto.windows.net', value: 'https://custom-cluster.kusto.windows.net' },
    ]);
  });

  it('should not add clusterUri if not provided', () => {
    const mockClusters: ClusterOption[] = [{ name: 'Cluster 1', uri: 'https://cluster1.kusto.windows.net' }];

    const result = parseClustersResponse(mockClusters, true);

    expect(result).toHaveLength(1);
    expect(result).toEqual([{ label: 'Cluster 1', value: 'https://cluster1.kusto.windows.net' }]);
  });
});
