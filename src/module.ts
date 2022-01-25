import { DataSourceApi, DataSourcePlugin } from '@grafana/data';
import { AdxDataSource } from './datasource';
import { QueryEditor } from './QueryEditor';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, KustoQuery } from './types';
import ConfigEditor from 'components/ConfigEditor';

export const plugin = new DataSourcePlugin<
  DataSourceApi<KustoQuery, AdxDataSourceOptions>,
  KustoQuery,
  AdxDataSourceOptions,
  AdxDataSourceSecureOptions
>(AdxDataSource as any)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
