import { t } from '@grafana/i18n';
import { LoadingState, QueryEditorProps } from '@grafana/data';
import { Alert, LoadingBar } from '@grafana/ui';
import { get } from 'lodash';
import { migrateQuery, needsToBeMigrated } from 'migrations/query';
import React, { useMemo, useState } from 'react';
import { useAsync, useEffectOnce } from 'react-use';
import { AdxDataSourceOptions, EditorMode, KustoQuery } from 'types';

import { AdxDataSource } from '../../datasource';
import { OpenAIEditor } from './OpenAIEditor';
import { QueryHeader } from './QueryHeader';
import { RawQueryEditor } from './RawQueryEditor';
import { VisualQueryEditor } from './VisualQueryEditor';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

export const QueryEditor: React.FC<Props> = (props) => {
  const { onChange, onRunQuery, query, datasource } = props;
  const schema = useAsync(() => {
    if (query.database) {
      const schema = datasource.getSchema(query.clusterUri, query.database, false);
      return schema;
    }

    return Promise.resolve(undefined);
  }, [datasource.id, query.clusterUri, query.database]);
  const databases = useAsync(
    () => datasource.getDatabases(query.clusterUri),
    [datasource.id, query.clusterUri, query.database]
  );

  const templateVariables = useTemplateVariables(datasource);
  const [dirty, setDirty] = useState(false);
  const isLoading = useMemo(() => props.data?.state === LoadingState.Loading, [props.data?.state]);

  useEffectOnce(() => {
    let processedQuery = query;
    if (typeof processedQuery !== 'string' && processedQuery.rawMode === undefined) {
      processedQuery.rawMode = datasource.getDefaultEditorMode() === EditorMode.Raw;
    }
    if (needsToBeMigrated(query)) {
      processedQuery = migrateQuery(query);
    }
    onChange(processedQuery);
    onRunQuery();
  });

  return (
    <>
      {schema.error && (
        <Alert
          title={t(
            'components.query-editor.title-could-not-load-datasource-schema',
            'Could not load datasource schema'
          )}
        >
          {parseSchemaError(schema.error)}
        </Alert>
      )}
      {isLoading ? <LoadingBar width={window.innerWidth} /> : <div style={{ height: 1 }} />}
      <QueryHeader
        query={query}
        onChange={onChange}
        datasource={datasource}
        dirty={dirty}
        setDirty={setDirty}
        onRunQuery={onRunQuery}
        templateVariableOptions={templateVariables}
        isLoading={isLoading}
        databases={databases}
      />
      {query.OpenAI ? (
        <OpenAIEditor
          {...props}
          schema={schema.value}
          database={query.database}
          datasource={datasource}
          templateVariableOptions={templateVariables}
          setDirty={() => !dirty && setDirty(true)}
        />
      ) : null}
      {query.rawMode ? (
        <RawQueryEditor
          {...props}
          schema={schema.value}
          database={query.database}
          templateVariableOptions={templateVariables}
          setDirty={() => !dirty && setDirty(true)}
        />
      ) : null}
      {!query.rawMode && !query.OpenAI ? (
        <VisualQueryEditor
          {...props}
          schema={schema.value}
          database={query.database}
          templateVariableOptions={templateVariables}
        />
      ) : null}
    </>
  );
};

function parseSchemaError(error: Error) {
  // error may be an object with a message
  let msg = get(error, 'data.Message', '');
  if (msg === '') {
    msg = get(error, 'data.message', '');
  }
  return msg || String(error);
}

const useTemplateVariables = (datasource: AdxDataSource) => {
  const variables = datasource.getVariables();

  return useMemo(() => {
    return {
      label: t('components.use-template-variables.label.template-variables', 'Template Variables'),
      expanded: false,
      options: variables.map((variable) => {
        return { label: variable, value: variable };
      }),
    };
  }, [variables]);
};
