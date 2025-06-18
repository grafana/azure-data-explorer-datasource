import { t } from '@grafana/i18n';
import { LoadingState, QueryEditorProps } from '@grafana/data';
import { Alert, LoadingBar } from '@grafana/ui';
import { get, set } from 'lodash';
import { migrateQuery, needsToBeMigrated } from 'migrations/query';
import React, { useEffect, useMemo, useState } from 'react';
import { useAsync, useEffectOnce } from 'react-use';
import { AdxDataSourceOptions, AdxSchema, EditorMode, KustoQuery } from 'types';

import { AdxDataSource } from '../../datasource';
import { OpenAIEditor } from './OpenAIEditor';
import { QueryHeader } from './QueryHeader';
import { RawQueryEditor } from './RawQueryEditor';
import { VisualQueryEditor } from './VisualQueryEditor';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

export const QueryEditor: React.FC<Props> = (props) => {
  const { onChange, onRunQuery, query, datasource } = props;
  const [schema, setSchema] = useState<AdxSchema>();
  const [schemaError, setSchemaError] = useState<Error | null>(null);

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

  useEffect(() => {
    if (query.clusterUri && query.database) {
      datasource
        .getSchema(query.clusterUri, query.database, false)
        .then((schema) => {
          setSchema(schema);
          setSchemaError(null);
        })
        .catch((error) => {
          console.error('Error loading schema:', error);
          setSchemaError(error);
        });
    }
  }, [query.clusterUri, query.database]);

  return (
    <>
      {schemaError && (
        <Alert
          title={t(
            'components.query-editor.title-could-not-load-datasource-schema',
            'Could not load datasource schema'
          )}
        >
          {parseSchemaError(schemaError)}
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
          schema={schema}
          database={query.database}
          datasource={datasource}
          templateVariableOptions={templateVariables}
          setDirty={() => !dirty && setDirty(true)}
        />
      ) : null}
      {query.rawMode ? (
        <RawQueryEditor
          {...props}
          schema={schema}
          database={query.database}
          templateVariableOptions={templateVariables}
          setDirty={() => !dirty && setDirty(true)}
        />
      ) : null}
      {!query.rawMode && !query.OpenAI ? (
        <VisualQueryEditor
          {...props}
          schema={schema}
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
