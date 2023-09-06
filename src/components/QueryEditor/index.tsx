import { QueryEditorProps } from '@grafana/data';
import { config } from '@grafana/runtime';
import { QueryEditor as LegacyQueryEditor } from 'components/LegacyQueryEditor/QueryEditor';
import { QueryEditor as NewQueryEditor } from './QueryEditor';
import { AdxDataSource } from 'datasource';
import React from 'react';
import { AdxDataSourceOptions, KustoQuery } from 'types';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

export const QueryEditor: React.FC<Props> = (props) => {
  return (config.featureToggles as any).adxLegacyEditor ? (
    <LegacyQueryEditor {...props} />
  ) : (
    <NewQueryEditor {...props} />
  );
};
