import React, { useMemo, useCallback, useEffect } from 'react';
import { useAsync } from 'react-use';
import { QueryEditorProps, PanelData } from '@grafana/data';
// Hack for issue: https://github.com/grafana/grafana/issues/26512
import {} from '@emotion/core';
import { AdxDataSource } from './datasource';
import { KustoQuery, AdxDataSourceOptions, AdxSchema } from 'types';
import { QueryEditorPropertyDefinition } from './editor/types';
import { RawQueryEditor } from './components/RawQueryEditor';
import { databaseToDefinition } from './schema/mapper';
import { VisualQueryEditor } from './components/VisualQueryEditor';
import { QueryEditorToolbar } from './components/QueryEditorToolbar';
import { SchemaLoading } from 'components/SchemaMessages';
import { needsToBeMigrated, migrateQuery } from 'migrations/query';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

export const QueryEditor: React.FC<Props> = props => {
  const { datasource } = props;
  const executedQuery = useExecutedQuery(props.data);
  const executedQueryError = useExecutedQueryError(props.data);
  const dirty = useDirty(props.query.query, executedQuery);
  const schema = useAsync(() => datasource.getSchema(), [datasource.id]);
  const templateVariables = useTemplateVariables(datasource);
  const databases = useDatabaseOptions(schema.value);
  const database = useSelectedDatabase(databases, props.query, datasource);
  const rawMode = isRawMode(props);

  useEffect(() => {
    if (needsToBeMigrated(props.query)) {
      props.onChange(migrateQuery(props.query));
      props.onRunQuery();
    }
  }, []);

  const onChangeDatabase = useCallback(
    (database: string) => {
      props.onChange({
        ...props.query,
        database,
      });
    },
    [props.onChange, props.query]
  );

  const onToggleEditorMode = useCallback(() => {
    props.onChange({
      ...props.query,
      rawMode: !rawMode,
      querySource: rawMode ? 'visual' : 'raw',
    });
  }, [props.onChange, props.query]);

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

  const editorMode = rawMode ? 'raw' : 'visual';

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
      {editorMode === 'raw' && (
        <RawQueryEditor
          {...props}
          schema={schema.value}
          templateVariableOptions={templateVariables}
          lastQuery={executedQuery}
          database={database}
        />
      )}
      {editorMode === 'visual' && (
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
  return useMemo(() => {
    const selected = options.find(option => option.value === query.database);

    if (selected) {
      return selected.value;
    }

    const variable = datasource.variables.find(variable => variable === query.database);

    if (variable) {
      return variable;
    }

    if (options.length > 0) {
      return options[0].value;
    }

    return '';
  }, [options, query.database, datasource.variables]);
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
  return useMemo(() => {
    return {
      label: 'Template Variables',
      expanded: false,
      options: datasource.variables.map(variable => {
        return { label: variable, value: variable };
      }),
    };
  }, [datasource.id]);
};

function isRawMode(props: Props): boolean {
  if (props.query.rawMode === undefined && props.query.query && !props.query.expression?.from) {
    return true;
  }
  return props.query.rawMode || false;
}
