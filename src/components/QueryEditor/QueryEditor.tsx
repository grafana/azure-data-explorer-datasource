import { QueryEditorProps } from '@grafana/data';
import { Alert } from '@grafana/ui';
import { get } from 'lodash';
import { migrateQuery, needsToBeMigrated } from 'migrations/query';
import React from 'react';
import { useAsync, useEffectOnce } from 'react-use';
import { AdxDataSourceOptions, EditorMode, KustoQuery } from 'types';

import { AdxDataSource } from '../../datasource';
import { QueryHeader } from './QueryHeader';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

export const QueryEditor: React.FC<Props> = (props) => {
  const { onChange, onRunQuery, query, datasource } = props;
  const schema = useAsync(() => datasource.getSchema(false), [datasource.id]);

  useEffectOnce(() => {
    let processedQuery = query;
    if (needsToBeMigrated(query)) {
      processedQuery = migrateQuery(query);
      onChange(processedQuery);
      onRunQuery();
    }
    if (processedQuery.rawMode === undefined) {
      onChange({
        ...processedQuery,
        rawMode: datasource.getDefaultEditorMode() === EditorMode.Raw,
      });
      onRunQuery();
    }
  });

  return (
    <>
      {schema.error && <Alert title="Could not load datasource schema">{parseSchemaError(schema.error)}</Alert>}
      <QueryHeader query={query} onChange={onChange} schema={schema} datasource={datasource} />
      {query.rawMode ? <>[RAW EDITOR] To be implemented</> : <>[VISUAL EDITOR] To be implemented</>}
    </>
  );
};

function parseSchemaError(error: Error) {
  // error may be an object with a message
  return get(error, 'data.Message', String(error));
}
