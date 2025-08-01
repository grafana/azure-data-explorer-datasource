import { DataSourcePlugin, DashboardLoadedEvent } from '@grafana/data';
import ConfigEditor from 'components/ConfigEditor';
import { getAppEvents, getDataSourceSrv } from '@grafana/runtime';
import pluginJson from './plugin.json';

import { AdxDataSource } from './datasource';
import { QueryEditor } from './components/QueryEditor/QueryEditor';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, KustoQuery } from './types';
import EditorHelp from 'components/QueryEditor/EditorHelp';
import { analyzeQueries, trackADXMonitorDashboardLoaded } from 'tracking';

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
    if (!adxQueries?.length) {
      return;
    }

    trackADXMonitorDashboardLoaded({
      adx_plugin_version: plugin.meta.info.version,
      grafana_version: grafanaVersion,
      dashboard_id: dashboardId,
      org_id: orgId,
      ...analyzeQueries(adxQueries, getDataSourceSrv()),
    });
  }
);
