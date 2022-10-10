import { DataSourcePlugin, DashboardLoadedEvent } from '@grafana/data';
import ConfigEditor from 'components/ConfigEditor';
import { getAppEvents } from '@grafana/runtime';
import pluginJson from './plugin.json';

import { AdxDataSource } from './datasource';
import { QueryEditor } from './components/QueryEditor';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, FormatOptions, KustoQuery } from './types';
import EditorHelp from 'components/QueryEditor/EditorHelp';
import { trackADXMonitorDashboardLoaded } from 'tracking';

export const plugin = new DataSourcePlugin<AdxDataSource, KustoQuery, AdxDataSourceOptions, AdxDataSourceSecureOptions>(
  AdxDataSource
)
  .setConfigEditor(ConfigEditor)
  .setQueryEditorHelp(EditorHelp)
  .setQueryEditor(QueryEditor);

// Track dashboard loads to RudderStack
getAppEvents().subscribe<DashboardLoadedEvent<KustoQuery>>(
  DashboardLoadedEvent,
  ({ payload: { dashboardId, orgId, grafanaVersion, queries } }) => {
    const adxQueries = queries[pluginJson.id]?.filter((q) => !q.hide);
    if (adxQueries && adxQueries.length > 0) {
      return;
    }
    const counters = {
      table_queries: 0,
      time_series_queries: 0,
      adx_time_series_queries: 0,
      query_builder_queries: 0,
      raw_queries: 0,
    };
    adxQueries.forEach((query) => {
      switch (query.resultFormat) {
        case FormatOptions.table:
          counters.table_queries++;
          break;
        case FormatOptions.timeSeries:
          counters.time_series_queries++;
          break;
        case FormatOptions.adxTimeSeries:
          counters.adx_time_series_queries++;
          break;
      }
      query.rawMode ? counters.raw_queries++ : counters.query_builder_queries++;
    });

    trackADXMonitorDashboardLoaded({
      adx_plugin_version: pluginJson.info.version,
      grafana_version: grafanaVersion,
      dashboard_id: dashboardId,
      org_id: orgId,
      ...counters,
    });
  }
);
