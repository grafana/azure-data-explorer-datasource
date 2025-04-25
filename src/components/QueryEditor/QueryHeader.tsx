import React, { useEffect, useMemo, useState } from 'react';

import { llm } from '@grafana/llm';
import { EditorHeader, FlexItem, InlineSelect } from '@grafana/plugin-ui';
import {
  Alert,
  Button,
  Card,
  ConfirmModal,
  CustomScrollbar,
  LoadingPlaceholder,
  RadioButtonGroup,
  useStyles2
} from '@grafana/ui';

import { css } from '@emotion/css';
import { GrafanaTheme2, renderMarkdown, SelectableValue } from '@grafana/data';
import { reportInteraction } from '@grafana/runtime';
import { AdxDataSource } from 'datasource';
import { useAsync } from 'react-use';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { parseClustersResponse } from 'response_parser';
import { databaseToDefinition } from 'schema/mapper';
import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from 'schema/types';
import { selectors } from 'test/selectors';
import { AdxSchema, ClusterOption, defaultQuery, EditorMode, FormatOptions, KustoQuery } from '../../types';

export interface QueryEditorHeaderProps {
  datasource: AdxDataSource;
  query: KustoQuery;
  schema: AsyncState<AdxSchema>;
  dirty: boolean;
  setDirty: (b: boolean) => void;
  onChange: (value: KustoQuery) => void;
  onRunQuery: () => void;
  templateVariableOptions: SelectableValue<string>;
  isLoading?: boolean;
}

const EDITOR_MODES = [
  { label: 'Builder', value: EditorMode.Visual },
  { label: 'KQL', value: EditorMode.Raw },
  { label: 'OpenAI', value: EditorMode.OpenAI },
];

const EDITOR_FORMATS: Array<SelectableValue<string>> = [
  { label: 'Table', value: FormatOptions.table },
  { label: 'Time series', value: FormatOptions.timeSeries },
  { label: 'Trace', value: FormatOptions.trace },
  { label: 'Logs', value: FormatOptions.logs },
];

const adxTimeFormat: SelectableValue<string> = {
  label: 'ADX Time series',
  value: FormatOptions.adxTimeSeries,
};

export const QueryHeader = (props: QueryEditorHeaderProps) => {
  const TOKEN_NOT_FOUND = 'An error occurred generating your query, tweak your prompt and try again.';
  const { query, onChange, schema, datasource, dirty, setDirty, onRunQuery, templateVariableOptions, isLoading } = props;
  const { rawMode, OpenAI } = query;
  const [clusterUri, setClusterUri] = useState(query.clusterUri);
  const [clusters, setClusters] = useState<Array<SelectableValue<string>>>([]);
  const databases = useDatabaseOptions(schema.value);
  const database = useSelectedDatabase(databases, query, datasource);
  const [formats, setFormats] = useState(EDITOR_FORMATS);
  const [showWarning, setShowWarning] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [hasError, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(TOKEN_NOT_FOUND);
  const [generatedExplanation, setGeneratedExplanation] = useState('');
  const baselinePrompt = `You are a KQL expert and a Grafana expert that can explain any KQL query that contains Grafana macros clearly to someone who isn't familiar with KQL or Grafana. Explain the following KQL and return your answer in markdown format highlighting grafana macros, database names and variable names with back ticks.\nText:"""`;

  const styles = useStyles2(getStyles);

  useAsync(async () => {
    const enabled = await llm.enabled();
    setIsAiEnabled(enabled);
  });

  const changeEditorMode = (value: EditorMode) => {
    reportInteraction('grafana_ds_adx_editor_mode');
    if (value === EditorMode.Visual && dirty) {
      setShowWarning(true);
    } else {
      onChange({ ...query, rawMode: value === EditorMode.Raw, OpenAI: value === EditorMode.OpenAI });
    }
  };

  useEffect(() => {
    if (database && query.database !== database) {
      onChange({ ...query, database });
    }
  }, [query, database, onChange]);

  useEffect(() => {
    if (rawMode) {
      setFormats(EDITOR_FORMATS.concat(adxTimeFormat));
    } else {
      setFormats(EDITOR_FORMATS);
    }
  }, [rawMode]);

  useEffect(() => {
    if (!query.resultFormat) {
      onChange({ ...query, resultFormat: 'table' });
    }
    if (query.resultFormat === adxTimeFormat.value && !rawMode) {
      // Fallback to Time Series since time_series_adx_series is not available when not in rawMode
      onChange({ ...query, resultFormat: 'time_series' });
    }
  }, [query, formats, onChange, rawMode]);

  useEffect(() => {
    datasource.getClusters().then((result: ClusterOption[]) => {
      const clusters = parseClustersResponse(result);
      setClusters(clusters);
      if (!clusterUri) {
        datasource.getDefaultOrFirstCluster().then((cluster: string) => {
          setClusterUri(cluster);
        });
      }
    });
  }, [datasource, clusterUri]);

  const onClusterChange = ({ value }: SelectableValue) => {
    setClusterUri(value);
    onChange({ ...query, clusterUri: value, expression: defaultQuery.expression });
  };

  const onDatabaseChange = ({ value }: SelectableValue) => {
    onChange({ ...query, database: value!, expression: defaultQuery.expression });
    onRunQuery();
  };

  const showExplanation = () => {
    setWaiting(true);
    reportInteraction('grafana_ds_adx_openai_kql_query_explanation_generated_with_llm_plugin');
    const stream = llm
      .streamChatCompletions({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: baselinePrompt },
          { role: 'user', content: `${query.query}"""` },
        ],
      })
      .pipe(llm.accumulateContent());
    stream.subscribe({
      next: (m) => {
        setGeneratedExplanation(m);
      },
      complete: () => {
        setWaiting(false);
      },
      error: (e) => {
        setError(true);
        setErrorMessage(e);
      },
    });
  };

  const EditorSelector = () => {
    if (rawMode) {
      return EditorMode.Raw;
    }

    if (OpenAI) {
      return EditorMode.OpenAI;
    }

    return EditorMode.Visual;
  };

  return (
    <EditorHeader>
      <ConfirmModal
        isOpen={showWarning}
        title="Are you sure?"
        body="You will lose manual changes done to the query if you go back to the visual builder."
        confirmText="Confirm"
        onConfirm={() => {
          setShowWarning(false);
          onChange({ ...query, rawMode: false });
          setDirty(false);
        }}
        onDismiss={() => {
          setShowWarning(false);
        }}
      ></ConfirmModal>
      <InlineSelect
        label="Cluster"
        data-testid={selectors.components.queryEditor.cluster.input.label}
        aria-label="Cluster"
        options={clusters.concat({
          ...templateVariableOptions,
          value: templateVariableOptions.value || '',
          type: QueryEditorPropertyType.String,
        })}
        value={clusterUri}
        onChange={onClusterChange}
        allowCustomValue={true}
      />
      <InlineSelect
        label="Database"
        data-testid={selectors.components.queryEditor.database.input.label}
        aria-label="Database"
        options={databases.concat({
          ...templateVariableOptions,
          value: templateVariableOptions.value || '',
          type: QueryEditorPropertyType.String,
        })}
        value={database}
        isLoading={schema.loading}
        onChange={onDatabaseChange}
      />
      <InlineSelect
        label="Format as"
        options={formats}
        value={query.resultFormat}
        onChange={({ value }) => {
          onChange({ ...query, resultFormat: value! });
        }}
      />
      <FlexItem grow={1} />
      {query.rawMode && (
        <Button variant="secondary" size="sm" onClick={showExplanation} disabled={!isAiEnabled}>
          Explain KQL
        </Button>
      )}
      {!query.OpenAI && (
        <Button
          variant="primary"
          icon={isLoading ? 'spinner' : 'play'}
          size="sm"
          onClick={onRunQuery}
          data-testid={selectors.components.queryEditor.runQuery.button}
        >
          Run query
        </Button>
      )}
      <RadioButtonGroup size="sm" options={EDITOR_MODES} value={EditorSelector()} onChange={changeEditorMode} />
      {hasError && (
        <Alert
          onRemove={() => {
            setError(false);
            setErrorMessage(TOKEN_NOT_FOUND);
          }}
          severity="error"
          title={errorMessage}
        />
      )}
      {query.rawMode && generatedExplanation && !hasError && (
        <Card className={styles.card}>
          <Card.Heading>
            <div>KQL Explanation</div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setGeneratedExplanation('')}
              data-testid="close-kql-explanation"
            >
              x
            </Button>
          </Card.Heading>
          <CustomScrollbar hideTracksWhenNotNeeded={true} showScrollIndicators={true} autoHeightMax="175px">
            <Card.Description>
              {waiting ? (
                <LoadingPlaceholder text="Loading..." />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(generatedExplanation) }}></div>
              )}
            </Card.Description>
          </CustomScrollbar>
        </Card>
      )}
    </EditorHeader>
  );
};

const useSelectedDatabase = (
  options: QueryEditorPropertyDefinition[],
  query: KustoQuery,
  datasource: AdxDataSource
): string => {
  const defaultDB = useAsync(() => datasource.getDefaultOrFirstDatabase(), [datasource]);
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
      const result = options.find((x) => x.value === defaultDB.value);

      if (result) {
        return result.value;
      } else {
        return options[0].value;
      }
    }

    return '';
  }, [options, variables, query.database, defaultDB.value]);
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

const getStyles = (theme: GrafanaTheme2) => {
  return {
    card: css({
      display: 'flex',
      flexDirection: 'column',
      marginBottom: '20px',
    }),
  };
};
