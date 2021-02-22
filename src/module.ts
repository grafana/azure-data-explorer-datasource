import { DataSourcePlugin } from '@grafana/data';
import { AdxDataSource } from './datasource';
import { QueryEditor } from './QueryEditor';
// import { KustoDBConfigCtrl } from 'config_ctrl';
import { KustoDBAnnotationsQueryCtrl } from './annotations_query_ctrl';
import { AdxDataSourceOptions, KustoQuery } from './types';
import ConfigEditor from 'ConfigEditor';

export const plugin = new DataSourcePlugin<AdxDataSource, KustoQuery, AdxDataSourceOptions>(AdxDataSource)
  // .setConfigCtrl(KustoDBConfigCtrl)
  .setConfigEditor(ConfigEditor)
  .setAnnotationQueryCtrl(KustoDBAnnotationsQueryCtrl)
  .setQueryEditor(QueryEditor);
