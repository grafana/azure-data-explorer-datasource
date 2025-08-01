import { GrafanaTheme2, QueryEditorProps, SelectableValue } from '@grafana/data';
import { llm } from '@grafana/llm';
import { getTemplateSrv, reportInteraction } from '@grafana/runtime';
import { Alert, Button, CodeEditor, Spinner, Monaco, MonacoEditor, useStyles2, TextArea, Stack } from '@grafana/ui';
import { AdxDataSource } from 'datasource';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { selectors } from 'test/selectors';
import { AdxDataSourceOptions, AdxSchema, KustoQuery } from 'types';
import { cloneDeep } from 'lodash';
import { css } from '@emotion/css';
import { useAsync } from 'react-use';

import { getFunctions, getSignatureHelp } from './Suggestions';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface RawQueryEditorProps extends Props {
  schema?: AdxSchema;
  database: string;
  templateVariableOptions: SelectableValue<string>;
  setDirty: () => void;
}

interface Worker {
  setSchemaFromShowSchema: (schema: AdxSchema, url: string, database: string) => void;
}

export const OpenAIEditor: React.FC<RawQueryEditorProps> = (props) => {
  const TOKEN_NOT_FOUND = 'An error occurred generating your query, tweak your prompt and try again.';
  const { schema, datasource, onRunQuery } = props;
  const [worker, setWorker] = useState<Worker>();
  const [prompt, setPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState(TOKEN_NOT_FOUND);
  const [isWaiting, setWaiting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [hasError, setError] = useState(false);
  const [generatedQuery, setGeneratedQuery] = useState('//OpenAI generated query');
  const [variables] = useState(getTemplateSrv().getVariables());
  const [stateSchema, setStateSchema] = useState(cloneDeep(schema));
  const styles = useStyles2(getStyles);
  const baselinePrompt = `You are an AI assistant that is fluent in KQL for querying Azure Data Explorer and you only respond with the correct KQL code snippets and no explanations. Generate a query that fulfills the following text.\nText:"""`;

  useAsync(async () => {
    const enabled = await llm.enabled();
    setEnabled(enabled);
  });

  const onRawQueryChange = (kql: string) => {
    if (kql !== props.query.query) {
      props.setDirty();
      props.onChange({
        ...props.query,
        query: kql,
      });
    }
  };

  useEffect(() => {
    if (schema && !stateSchema) {
      setStateSchema(cloneDeep(schema));
    }
  }, [schema, stateSchema]);

  const generateQuery = () => {
    reportInteraction('grafana_ds_adx_openai_query_generated');
    setWaiting(true);
    setError(false);
    setErrorMessage(TOKEN_NOT_FOUND);
    if (enabled) {
      newGenerateQuery(); //eventually this will replace this function
    } else {
      datasource
        .generateQueryForOpenAI(`${baselinePrompt}${prompt}"""`)
        .then((resp) => {
          setWaiting(false);
          setGeneratedQuery(resp);
        })
        .catch((e) => {
          setWaiting(false);
          if (e.data?.Message) {
            setErrorMessage(e.data?.Message);
          }
          setError(true);
        });
    }
  };

  const newGenerateQuery = () => {
    reportInteraction('grafana_ds_adx_openai_query_generated_with_llm_plugin');
    const stream = llm
      .streamChatCompletions({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: baselinePrompt },
          { role: 'user', content: `${prompt}"""` },
        ],
      })
      .pipe(llm.accumulateContent());
    stream.subscribe({
      next: (m) => {
        setGeneratedQuery(m);
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

  const onPromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const handleEditorMount = (editor: MonacoEditor, monaco: Monaco) => {
    monaco.languages.registerSignatureHelpProvider('kusto', {
      signatureHelpTriggerCharacters: ['(', ')'],
      provideSignatureHelp: getSignatureHelp,
    });

    const model = editor.getModel();

    // Handle cases where kusto is already loaded or will be loaded via AMD
    if (monaco.languages['kusto'] && monaco.languages['kusto'].getKustoWorker) {
      monaco.languages['kusto']
        .getKustoWorker()
        .then((kusto) => {
          return model && kusto(model.uri);
        })
        .then((worker) => {
          setWorker(worker);
        });
    } else {
      // Handle cases where kusto should be loaded via ESM web worker (Grafana 10.3.x)
      if ('System' in window) {
        window.System.import('@kusto/monaco-kusto').then((kustoModule) => {
          if (kustoModule && kustoModule.getKustoWorker) {
            kustoModule
              .getKustoWorker()
              .then((workerAccessor) => {
                return model && workerAccessor(model.uri);
              })
              .then((worker) => {
                setWorker(worker);
              });
          } else {
            console.log('kusto monaco language failed to load.');
          }
        });
      }
    }
  };

  useEffect(() => {
    if (worker && stateSchema?.Databases) {
      // Populate Database schema with macros
      Object.keys(stateSchema.Databases).forEach((db) =>
        Object.assign(stateSchema.Databases[db].Functions, getFunctions(variables))
      );
      worker.setSchemaFromShowSchema(stateSchema, 'https://help.kusto.windows.net', props.database);
    }
  }, [worker, stateSchema, variables, props.database]);

  if (!stateSchema) {
    return null;
  }

  return (
    <div>
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
      {!enabled && (
        <Alert
          onRemove={() => {
            setError(false);
            setErrorMessage(TOKEN_NOT_FOUND);
          }}
          severity="info"
          title={'You need to enable the LLM plugin to use this feature.'}
        >
          Install the LLM plugin from the{' '}
          <a className={styles.link} href="https://grafana.com/grafana/plugins/grafana-llm-app/">
            catalog
          </a>
          . You can then{' '}
          <a className={styles.link} href="/plugins/grafana-llm-app">
            enable
          </a>{' '}
          it.
        </Alert>
      )}
      <div className={styles.outerMargin}>
        <Stack justifyContent="flex-start" alignItems="flex-start" direction={'row'}>
          <h5>Ask OpenAI to generate a KQL query</h5>
          <Button
            className={styles.buttonLeftMargin}
            onClick={generateQuery}
            icon="message"
            variant="primary"
            size="sm"
          >
            {isWaiting && <Spinner className={styles.spinnerSpace} inline={true} />} Generate query
          </Button>
        </Stack>
        <TextArea
          data-testid={selectors.components.queryEditor.codeEditor.openAI}
          value={prompt}
          onChange={onPromptChange}
          className={styles.innerMargin}
        ></TextArea>
      </div>
      <div className={styles.dividerSpace}>
        <Stack justifyContent="flex-start" alignItems="flex-start" direction={'row'}>
          <h5>Generated query</h5>
          <Button
            className={styles.buttonLeftMargin}
            variant="primary"
            icon="play"
            size="sm"
            onClick={() => {
              onRawQueryChange(generatedQuery);
              onRunQuery();
            }}
            data-testid={selectors.components.queryEditor.runQuery.button}
          >
            Run query
          </Button>
        </Stack>
        <div className={styles.editorSpace} data-testid={selectors.components.queryEditor.codeEditor.container}>
          <CodeEditor
            language="kusto"
            value={generatedQuery}
            onBlur={(q) => {
              onRawQueryChange(q);
              onRunQuery();
            }}
            showMiniMap={false}
            showLineNumbers={true}
            height="240px"
            onEditorDidMount={handleEditorMount}
          />
        </div>
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    outerMargin: css({
      marginTop: theme.spacing(1),
    }),
    link: css({
      color: theme.colors.text.link,
      textDecoration: 'underline',
    }),
    innerMargin: css({
      marginTop: theme.spacing(2),
    }),
    editorSpace: css({
      paddingTop: theme.spacing(1),
    }),
    spinnerSpace: css({
      paddingRight: theme.spacing(1),
    }),
    buttonLeftMargin: css({
      marginLeft: theme.spacing(1),
    }),
    dividerSpace: css({
      marginTop: theme.spacing(4),
    }),
  };
};
