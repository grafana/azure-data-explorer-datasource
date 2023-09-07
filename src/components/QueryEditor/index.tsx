import { QueryEditorProps } from '@grafana/data';
import { config } from '@grafana/runtime';
import { QueryEditor as LegacyQueryEditor } from 'components/LegacyQueryEditor/QueryEditor';
import { QueryEditor as NewQueryEditor } from './QueryEditor';
import { AdxDataSource } from 'datasource';
import React from 'react';
import { AdxDataSourceOptions, KustoQuery } from 'types';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

export const QueryEditor: React.FC<Props> = (props) => {
  // Using any here as the adxLegacyEditor property doesn't exist as a feature toggle anymore. This code will be removed.
  if ((config.featureToggles as any).adxLegacyEditor) {
    return <LegacyQueryEditor {...props} />;
  }
  return <NewQueryEditor {...props} />;
};
