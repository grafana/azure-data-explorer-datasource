import { QueryEditorProps } from '@grafana/data';
import { Alert } from '@grafana/ui';
import { get } from 'lodash';
import { migrateQuery, needsToBeMigrated } from 'migrations/query';
import React, { useMemo, useState } from 'react';
import { useAsync, useEffectOnce } from 'react-use';
import { AdxDataSourceOptions, EditorMode, KustoQuery } from 'types';

import { AdxDataSource } from '../../datasource';
import { QueryHeader } from './QueryHeader';
import { RawQueryEditor } from './RawQueryEditor';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

export const QueryEditor: React.FC<Props> = (props) => {
  const { onChange, onRunQuery, query, datasource } = props;
  const schema = useAsync(() => datasource.getSchema(false), [datasource.id]);
  const templateVariables = useTemplateVariables(datasource);
  const [dirty, setDirty] = useState(false);

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
      <QueryHeader
        query={query}
        onChange={onChange}
        schema={schema}
        datasource={datasource}
        dirty={dirty}
        setDirty={setDirty}
      />
      {query.rawMode ? (
        <RawQueryEditor
          {...props}
          schema={schema.value}
          database={query.database}
          templateVariableOptions={templateVariables}
          setDirty={() => !dirty && setDirty(true)}
        />
      ) : (
        <>[VISUAL EDITOR] To be implemented</>
      )}
    </>
  );
};

function parseSchemaError(error: Error) {
  // error may be an object with a message
  return get(error, 'data.Message', String(error));
}

const useTemplateVariables = (datasource: AdxDataSource) => {
  const variables = datasource.getVariables();

  return useMemo(() => {
    return {
      label: 'Template Variables',
      expanded: false,
      options: variables.map((variable) => {
        return { label: variable, value: variable };
      }),
    };
  }, [variables]);
};
