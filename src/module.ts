import { DataSourcePlugin, DashboardLoadedEvent } from '@grafana/data';
import ConfigEditor from 'components/ConfigEditor';
import { getAppEvents, getDataSourceSrv } from '@grafana/runtime';
import { initPluginTranslations } from '@grafana/i18n';
import pluginJson from './plugin.json';

import { AdxDataSource } from './datasource';
import { QueryEditor } from './components/QueryEditor/QueryEditor';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, KustoQuery } from './types';
import EditorHelp from 'components/QueryEditor/EditorHelp';
import { analyzeQueries, trackADXMonitorDashboardLoaded } from 'tracking';

// we wrap the plugin in an async function to allow top-level await
// this is needed to load translations in the plugin
// @TODO: remove this when top-level await is supported in jest/@grafana runtime
export const plugin = (async () => {
  // don't load plugin translations in test environments
  // we don't use them anyway, and top-level await won't work currently in jest
  if (process.env.NODE_ENV !== 'test') {
    await initPluginTranslations(pluginJson.id);
  }

  const ds = new DataSourcePlugin<AdxDataSource, KustoQuery, AdxDataSourceOptions, AdxDataSourceSecureOptions>(
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
        adx_plugin_version: ds.meta.info.version,
        grafana_version: grafanaVersion,
        dashboard_id: dashboardId,
        org_id: orgId,
        ...analyzeQueries(adxQueries, getDataSourceSrv()),
      });
    }
  );

  return ds;
})();


