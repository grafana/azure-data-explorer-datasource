import { reportInteraction } from '@grafana/runtime';

/**
 * Loaded the first time a dashboard containing ADX queries is loaded (not on every render)
 * Note: The queries used here are the ones pre-migration and pre-filterQuery
 *
 * This allows answering questions about:
 * - the adoption of the plugin features
 * - stats about number of ADX dashboards loaded, number of users
 * - stats about the grafana and plugins versions used by our users
 *
 * Dashboard: https://ops.grafana.net/d/Ad0pti0N/data-sources-adoption-tracking?orgId=1
 * Changelog:
 * - 4.1.7: Initial version
 */
export const trackADXMonitorDashboardLoaded = (props: ADXMonitorDashboardLoadedProps) => {
  reportInteraction('grafana_ds_adx_dashboard_loaded', props);
};

export type ADXMonitorDashboardLoadedProps = {
  adx_plugin_version?: string;
  grafana_version?: string;
  dashboard_id: string;
  org_id?: number;
  /** number of queries using the "Table" format  */
  table_queries: number;
  /** number of queries using the "Time Series" format  */
  time_series_queries: number;
  /** number of queries using the "ADX Time Series" format  */
  adx_time_series_queries: number;
  /** number of queries using the query builder  */
  query_builder_queries: number;
  /** number of queries using the Kusto editor  */
  raw_queries: number;
};
