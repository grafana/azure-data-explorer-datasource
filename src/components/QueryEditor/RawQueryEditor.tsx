import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { CodeEditor, Monaco, MonacoEditor } from '@grafana/ui';
import { AdxDataSource } from 'datasource';
import React, { useEffect, useState } from 'react';
import { selectors } from 'test/selectors';
import { AdxDataSourceOptions, AdxSchema, KustoQuery } from 'types';
import { cloneDeep } from 'lodash';

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
