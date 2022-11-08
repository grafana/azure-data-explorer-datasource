import { analyzeQueries } from 'tracking';
import { EditorMode, FormatOptions, KustoQuery } from 'types';

describe('analyzeQueries', () => {
  [
    {
      description: 'should count 1 table query',
      queries: [{ resultFormat: FormatOptions.table }],
      expectedCounters: { table_queries: 1, time_series_queries: 0, adx_time_series_queries: 0 },
    },
    {
      description: 'should count 1 time series query',
      queries: [{ resultFormat: FormatOptions.timeSeries }],
      expectedCounters: { table_queries: 0, time_series_queries: 1, adx_time_series_queries: 0 },
    },
    {
      description: 'should count 1 adx time series query',
      queries: [{ resultFormat: FormatOptions.adxTimeSeries }],
      expectedCounters: { table_queries: 0, time_series_queries: 0, adx_time_series_queries: 1 },
    },
    {
      description: 'should count 1 raw query',
      queries: [{ rawMode: true }],
      expectedCounters: { raw_queries: 1, query_builder_queries: 0 },
    },
    {
      description: 'should count 1 query builder query',
      queries: [{ rawMode: false }],
      expectedCounters: { raw_queries: 0, query_builder_queries: 1 },
    },
    {
      description: 'should count data source features',
      queries: [{ rawMode: false }],
      dsSettings: {
        jsonData: {
          onBehalfOf: true,
          queryTimeout: 10,
          dynamicCaching: true,
          dataConsistency: 'weakconsistency',
          defaultEditorMode: EditorMode.Raw,
          useSchemaMapping: true,
        },
      },
      expectedCounters: {
        on_behalf_of_queries: 1,
        queries_with_custom_timeout: 1,
        dynamic_caching_queries: 1,
        weak_data_consistency_queries: 1,
        queries_with_default_raw_editor: 1,
        queries_with_managed_schema: 1,
      },
    },
  ].forEach((t) => {
    it(t.description, () => {
      expect(
        analyzeQueries(
          t.queries as KustoQuery[],
          {
            getInstanceSettings: () => t.dsSettings || {},
          } as any
        )
      ).toMatchObject(t.expectedCounters);
    });
  });
});
