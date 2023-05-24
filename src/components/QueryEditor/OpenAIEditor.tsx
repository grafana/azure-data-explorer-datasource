import { GrafanaTheme2, QueryEditorProps, SelectableValue } from '@grafana/data';
import { getTemplateSrv, reportInteraction } from '@grafana/runtime';
import {
  Alert,
  Button,
  CodeEditor,
  Spinner,
  Monaco,
  MonacoEditor,
  useStyles2,
  TextArea,
  HorizontalGroup,
} from '@grafana/ui';
import { AdxDataSource } from 'datasource';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { selectors } from 'test/selectors';
import { AdxDataSourceOptions, AdxSchema, KustoQuery } from 'types';
import { cloneDeep } from 'lodash';
import { css } from '@emotion/css';

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
  const { schema, datasource } = props;
  const [worker, setWorker] = useState<Worker>();
  const [prompt, setPrompt] = useState('');
  const [isWaiting, setWaiting] = useState(false);
  const [hasError, setError] = useState(false);
  const [generatedQuery, setGeneratedQuery] = useState('//OpenAI generated query');
  const [variables] = useState(getTemplateSrv().getVariables());
  const [stateSchema, setStateSchema] = useState(cloneDeep(schema));
  const styles = useStyles2(getStyles);
  const baselinePrompt = `You are an AI assistant that is fluent in KQL for querying Azure Data Explorer and you only respond with the correct KQL code snippets and no explanations. Generate a query that fulfills the following text.\nText:"""`;

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
    setWaiting(true);
    setError(false);
    reportInteraction('grafana_ds_adx_openai_query_generated');
    datasource
      .generateQueryForOpenAI(`${baselinePrompt}${prompt}"""`)
      .then((resp) => {
        setWaiting(false);
        setGeneratedQuery(resp);
        onRawQueryChange(resp);
      })
      .catch((e) => {
        setWaiting(false);
        setError(true);
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
    monaco.languages['kusto']
      .getKustoWorker()
      .then((kusto) => {
        const model = editor.getModel();
        return model && kusto(model.uri);
      })
      .then((worker) => {
        setWorker(worker);
      });
  };

  useEffect(() => {
    if (worker && stateSchema) {
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
          onRemove={() => setError(false)}
          severity="error"
          title="An error occurred generating your query, tweak your prompt and try again."
        />
      )}
      <div className={styles.outerMargin}>
        <HorizontalGroup justify="space-between">
          <h5>Ask OpenAI to generate a KQL query</h5>
          <Button onClick={generateQuery} variant={'secondary'} size={'sm'}>
            {isWaiting && <Spinner inline={true} />} Generate query
          </Button>
        </HorizontalGroup>
        <TextArea
          data-testid={selectors.components.queryEditor.codeEditor.openAI}
          value={prompt}
          onChange={onPromptChange}
          className={styles.innerMargin}
        ></TextArea>
      </div>
      <div className={styles.innerMargin}>
        <h5>Generated query</h5>
        <div data-testid={selectors.components.queryEditor.codeEditor.container}>
          <CodeEditor
            language="kusto"
            value={generatedQuery}
            onBlur={onRawQueryChange}
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
    innerMargin: css({
      marginTop: theme.spacing(2),
    }),
  };
};
