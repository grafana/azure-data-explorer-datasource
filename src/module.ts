import { DataSourcePlugin } from '@grafana/data';
import { AdxDataSource } from './datasource';
import { QueryEditor } from './QueryEditor';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, KustoQuery } from './types';
import ConfigEditor from 'components/ConfigEditor';

export const plugin = new DataSourcePlugin<AdxDataSource, KustoQuery, AdxDataSourceOptions, AdxDataSourceSecureOptions>(
  AdxDataSource
)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
