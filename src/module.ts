import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './datasource';
import { QueryEditor } from './QueryEditor';
import { MyQuery, MyDataSourceOptions } from './types';
import { KustoDBConfigCtrl } from 'config_ctrl';
import { KustoDBAnnotationsQueryCtrl } from 'annotations_query_ctrl';

export const plugin = new DataSourcePlugin<DataSource, MyQuery, MyDataSourceOptions>(DataSource)
  .setConfigCtrl(KustoDBConfigCtrl)
  .setAnnotationQueryCtrl(KustoDBAnnotationsQueryCtrl)
  .setQueryEditor(QueryEditor);
