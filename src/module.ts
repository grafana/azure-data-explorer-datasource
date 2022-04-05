import { DataSourcePlugin } from '@grafana/data';
import ConfigEditor from 'components/ConfigEditor';

import { AdxDataSource } from './datasource';
import { QueryEditor } from './QueryEditor';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, KustoQuery } from './types';

export const plugin = new DataSourcePlugin<AdxDataSource, KustoQuery, AdxDataSourceOptions, AdxDataSourceSecureOptions>(
  AdxDataSource as any
)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
