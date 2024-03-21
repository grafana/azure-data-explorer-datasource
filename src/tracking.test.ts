import { DataSourceInstanceSettings } from '@grafana/data';
import { ADXCounters, analyzeQueries } from 'tracking';
import { AdxDataSourceOptions, DeepPartial, EditorMode, FormatOptions, KustoQuery } from 'types';

interface TrackingTest {
  description: string;
  queries: Array<Partial<KustoQuery>>;
  expectedCounters: Partial<ADXCounters>;
  dsSettings?: DeepPartial<DataSourceInstanceSettings<AdxDataSourceOptions>>;
}

describe('analyzeQueries', () => {
  const tests: TrackingTest[] = [
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
      description: 'should count 1 OpenAI query',
      queries: [{ OpenAI: true }],
      expectedCounters: { open_ai_queries: 1 },
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
          queryTimeout: '10',
          dynamicCaching: true,
          dataConsistency: 'weakconsistency',
          defaultEditorMode: EditorMode.Raw,
          useSchemaMapping: true,
        },
      },
      expectedCounters: {
        queries_with_custom_timeout: 1,
        dynamic_caching_queries: 1,
        weak_data_consistency_queries: 1,
        queries_with_default_raw_editor: 1,
        queries_with_managed_schema: 1,
      },
    },
    {
      description: 'should count OBO when on-behalf-of credentials configured',
      queries: [{ rawMode: false }],
      dsSettings: {
        jsonData: {
          azureCredentials: {
            authType: 'clientsecret-obo',
            azureCloud: 'AzureCloud',
            clientId: '123',
            tenantId: '123',
          },
          onBehalfOf: false,
        },
      },
      expectedCounters: {
        on_behalf_of_queries: 1,
      },
    },
    {
      description: 'should count OBO when legacy on-behalf-of credentials configured',
      queries: [{ rawMode: false }],
      dsSettings: {
        jsonData: {
          onBehalfOf: true,
        },
      },
      expectedCounters: {
        on_behalf_of_queries: 1,
      },
    },
    {
      description: 'should not count OBO when credentials are not OBO even if legacy on-behalf-of flag set',
      queries: [{ rawMode: false }],
      dsSettings: {
        jsonData: {
          azureCredentials: {
            authType: 'msi',
          },
          onBehalfOf: true,
        },
      },
      expectedCounters: {
        on_behalf_of_queries: 0,
      },
    },
    {
      description: 'should count current user queries',
      queries: [{ query: '' }],
      dsSettings: {
        jsonData: {
          azureCredentials: {
            authType: 'currentuser',
          },
        },
      },
      expectedCounters: { current_user_queries: 1 },
    },
    {
      description: 'should count MSI queries',
      queries: [{ query: '' }],
      dsSettings: {
        jsonData: {
          azureCredentials: {
            authType: 'msi',
          },
        },
      },
      expectedCounters: { msi_queries: 1 },
    },
    {
      description: 'should count app registration queries',
      queries: [{ query: '' }],
      dsSettings: {
        jsonData: {
          azureCredentials: {
            authType: 'clientsecret',
          },
        },
      },
      expectedCounters: { app_registration_queries: 1 },
    },
    {
      description: 'should count queries with no default cluster',
      queries: [{ query: '' }],
      dsSettings: {
        jsonData: {},
      },
      expectedCounters: { queries_no_default_cluster: 1 },
    },
    {
      description: 'should count queries that are not selecting a cluster',
      queries: [{ query: '' }],
      dsSettings: {},
      expectedCounters: { queries_no_selected_cluster: 1 },
    },
  ];
  tests.forEach((t) => {
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
