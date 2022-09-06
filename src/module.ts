import { DataSourcePlugin } from '@grafana/data';
import ConfigEditor from 'components/ConfigEditor';

import { AdxDataSource } from './datasource';
import { QueryEditor } from './components/QueryEditor';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, KustoQuery } from './types';
import EditorHelp from 'components/QueryEditor/EditorHelp';

export const plugin = new DataSourcePlugin<AdxDataSource, KustoQuery, AdxDataSourceOptions, AdxDataSourceSecureOptions>(
  AdxDataSource
)
  .setConfigEditor(ConfigEditor)
  .setQueryEditorHelp(EditorHelp)
  .setQueryEditor(QueryEditor);
