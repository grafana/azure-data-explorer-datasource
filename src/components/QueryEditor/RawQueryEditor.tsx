import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { getTemplateSrv, reportInteraction } from '@grafana/runtime';
import { CodeEditor, Monaco, MonacoEditor } from '@grafana/ui';
import { AdxDataSource } from 'datasource';
import { cloneDeep } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { selectors } from 'test/selectors';
import { AdxDataSourceOptions, AdxSchema, KustoQuery } from 'types';

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

export const RawQueryEditor: React.FC<RawQueryEditorProps> = (props) => {
  const { query, schema } = props;
  const [worker, setWorker] = useState<Worker>();
  const [variables] = useState(getTemplateSrv().getVariables());
  const [stateSchema, setStateSchema] = useState(cloneDeep(schema));
  const editorRef = useRef<MonacoEditor | null>(null);

  const onRawQueryChange = useCallback(() => {
      const kql = editorRef.current?.getValue() || '';
      reportInteraction('grafana_ds_adx_raw_editor_query_blurred');
      if (kql !== props.query.query) {
        props.setDirty();
        props.onChange({
          ...props.query,
          query: kql,
        });
        props.onRunQuery();
      }
    },
    [props]
  );
  
  const onKeyDownCapture = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        onRawQueryChange();
      }
    },
    [onRawQueryChange]
  );

  useEffect(() => {
    if (schema && !stateSchema) {
      setStateSchema(cloneDeep(schema));
    }
  }, [schema, stateSchema]);

  const handleEditorMount = (editor: MonacoEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monaco.languages.registerSignatureHelpProvider('kusto', {
      signatureHelpTriggerCharacters: ['(', ')'],
      provideSignatureHelp: getSignatureHelp,
    });

    const model = editor.getModel();

    if (stateSchema && stateSchema.Databases) {
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
    }
  };

  useEffect(() => {
    if (worker && stateSchema && stateSchema.Databases) {
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
    <div onKeyDownCapture={onKeyDownCapture}>
      <div data-testid={selectors.components.queryEditor.codeEditor.container}>
        <CodeEditor
          language="kusto"
          value={query.query}
          onBlur={onRawQueryChange}
          showMiniMap={false}
          showLineNumbers={true}
          height="240px"
          onEditorDidMount={handleEditorMount}
        />
      </div>
    </div>
  );
};
