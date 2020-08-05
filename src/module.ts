import { DataSourcePlugin } from '@grafana/data';
import { AdxDataSource } from './datasource';
import { QueryEditor } from './QueryEditor';
import { KustoDBConfigCtrl } from 'config_ctrl';
import { AnnotationCtrl } from './annotations_query_ctrl';
import { AdxDataSourceOptions, KustoQuery } from './types';

export const plugin = new DataSourcePlugin<AdxDataSource, KustoQuery, AdxDataSourceOptions>(AdxDataSource)
  .setConfigCtrl(KustoDBConfigCtrl)
  .setAnnotationQueryCtrl(AnnotationCtrl)
  .setQueryEditor(QueryEditor);
