import React, { useMemo, useCallback, useEffect } from 'react';
import { useAsync } from 'react-use';
import { QueryEditorProps, PanelData } from '@grafana/data';
// Hack for issue: https://github.com/grafana/grafana/issues/26512
import {} from '@emotion/core';
import { AdxDataSource } from './datasource';
import { KustoQuery, AdxDataSourceOptions, AdxSchema, EditorMode } from 'types';
import { QueryEditorPropertyDefinition } from './editor/types';
import { RawQueryEditor } from './components/RawQueryEditor';
import { databaseToDefinition } from './schema/mapper';
import { VisualQueryEditor } from './components/VisualQueryEditor';
import { QueryEditorToolbar } from './components/QueryEditorToolbar';
import { SchemaLoading } from 'components/SchemaMessages';
import { needsToBeMigrated, migrateQuery } from 'migrations/query';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

export const QueryEditor = (props: Props) => {
  const { datasource, onChange, onRunQuery, query } = props;
  const executedQuery = useExecutedQuery(props.data);
  const executedQueryError = useExecutedQueryError(props.data);
  const dirty = useDirty(props.query.query, executedQuery);
  const rawMode = isRawMode(props);
  const schema = useAsync(() => datasource.getSchema(false), [datasource.id]);
  const templateVariables = useTemplateVariables(datasource);
  const databases = useDatabaseOptions(schema.value);
  const database = useSelectedDatabase(databases, props.query, datasource);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (needsToBeMigrated(query)) {
      onChange(migrateQuery(query));
      onRunQuery();
    }

    if (isNewQuery(props) && isRawDefaultEditorMode(props)) {
      onChange({
        ...props.query,
        rawMode: true,
        querySource: EditorMode.Raw,
      });
      onRunQuery();
    }
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const onChangeDatabase = useCallback(
    (database: string) => {
      onChange({
        ...query,
        database,
      });
    },
    [onChange, query]
  );

  const onToggleEditorMode = useCallback(() => {
    onChange({
      ...query,
      rawMode: !rawMode,
      querySource: rawMode ? EditorMode.Visual : EditorMode.Raw,
    });
  }, [onChange, query, rawMode]);

  if (schema.loading) {
    return <SchemaLoading />;
  }

  if (schema.error) {
    if ((schema.error as any)?.data?.Message) {
      return (
        <div className="gf-form">
          <pre className="gf-form-pre alert alert-error">
            Could not load datasource schema due too: {(schema.error as any)?.data?.Message}
          </pre>
        </div>
      );
    }

    return (
      <div className="gf-form">
        <pre className="gf-form-pre alert alert-error">Could not load datasource schema: {String(schema.error)}</pre>
      </div>
    );
  }

  if (databases.length === 0) {
    return (
      <div className="gf-form">
        <pre className="gf-form-pre alert alert-warning">
          Datasource schema loaded but without any databases and tables, please try again..
        </pre>
      </div>
    );
  }

  const editorMode = rawMode ? EditorMode.Raw : EditorMode.Visual;

  return (
    <>
      {executedQueryError && (
        <div className="gf-form">
          <pre className="gf-form-pre alert alert-warning">Failed to execute query: {executedQueryError}</pre>
        </div>
      )}
      <QueryEditorToolbar
        onRunQuery={props.onRunQuery}
        onToggleEditorMode={onToggleEditorMode}
        editorMode={editorMode}
        onChangeDatabase={onChangeDatabase}
        database={database}
        databases={[templateVariables, ...databases]}
        dirty={dirty}
      />
      {editorMode === EditorMode.Raw && (
        <RawQueryEditor
          {...props}
          schema={schema.value}
          templateVariableOptions={templateVariables}
          lastQuery={executedQuery}
          database={database}
        />
      )}
      {editorMode === EditorMode.Visual && (
        <VisualQueryEditor
          datasource={datasource}
          database={database}
          onChangeQuery={props.onChange}
          query={props.query}
          schema={schema.value}
          templateVariableOptions={templateVariables}
        />
      )}
    </>
  );
};

const useSelectedDatabase = (
  options: QueryEditorPropertyDefinition[],
  query: KustoQuery,
  datasource: AdxDataSource
): string => {
  const variables = datasource.getVariables();

  return useMemo(() => {
    const selected = options.find((option) => option.value === query.database);

    if (selected) {
      return selected.value;
    }

    const variable = variables.find((variable) => variable === query.database);

    if (variable) {
      return variable;
    }

    if (options.length > 0) {
      return options[0].value;
    }

    return '';
  }, [options, variables, query.database]);
};

const useDatabaseOptions = (schema?: AdxSchema): QueryEditorPropertyDefinition[] => {
  return useMemo(() => {
    const databases: QueryEditorPropertyDefinition[] = [];

    if (!schema || !schema.Databases) {
      return databases;
    }

    for (const name of Object.keys(schema.Databases)) {
      const database = schema.Databases[name];
      databases.push(databaseToDefinition(database));
    }

    return databases;
  }, [schema]);
};

const useExecutedQuery = (data?: PanelData): string => {
  return useMemo(() => {
    return data?.series[0]?.meta?.executedQueryString ?? '';
  }, [data]);
};

const useDirty = (query: string, executedQuery: string): boolean => {
  return useMemo(() => {
    // we need to interpolate/deinterpolate it so we compare same things.
    return query !== executedQuery;
  }, [query, executedQuery]);
};

const useExecutedQueryError = (data?: PanelData): string | undefined => {
  return useMemo(() => {
    const kustoError = data?.series[0]?.meta?.custom?.KustoError;

    if (data?.error && !kustoError) {
      if (data.error.message) {
        return `${data.error.message}`;
      }
      return `${data.error}`;
    }

    return kustoError;
  }, [data]);
};

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

function isRawMode(props: Props): boolean {
  if (props.query.rawMode === undefined && props.query.query && !props.query.expression?.from) {
    return true;
  }

  return props.query.rawMode || false;
}

function isNewQuery(props: Props): boolean {
  return props.query.rawMode === undefined;
}

function isRawDefaultEditorMode(props: Props): boolean {
  return props.datasource.getDefaultEditorMode() === EditorMode.Raw;
}
