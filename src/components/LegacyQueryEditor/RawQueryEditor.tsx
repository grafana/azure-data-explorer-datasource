import { css } from '@emotion/css';
import { GrafanaTheme2, QueryEditorProps, SelectableValue } from '@grafana/data';
import { config, getTemplateSrv } from '@grafana/runtime';
import { CodeEditor, Icon, Monaco, MonacoEditor, useStyles2 } from '@grafana/ui';
import { QueryEditorResultFormat, selectResultFormat } from './QueryEditorResultFormat';
import { AdxDataSource } from 'datasource';
import { KustoMonacoEditor } from 'monaco/KustoMonacoEditor';
import React, { useEffect, useState } from 'react';
import { gte, valid, coerce } from 'semver';
import { selectors } from 'test/selectors';
import { AdxDataSourceOptions, AdxSchema, KustoQuery } from 'types';

import { getFunctions, getSignatureHelp } from '../QueryEditor/Suggestions';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface RawQueryEditorProps extends Props {
  dirty?: boolean;
  lastQueryError?: string;
  lastQuery?: string;
  timeNotASC?: boolean;
  schema?: AdxSchema;
  database: string;
  templateVariableOptions: SelectableValue<string>;
}

const defaultQuery = [
  '//change this to create your own time series query',
  '',
  '<table name>',
  '| where $__timeFilter(Timestamp)',
  '// | summarize count() by <group by column>, bin(Timestamp, $__timeInterval)',
  '// | order by Timestamp asc',
].join('\n');

interface Worker {
  setSchemaFromShowSchema: (schema: AdxSchema, url: string, database: string) => void;
}

// Since Grafana 8.5, the query editor includes a version of the Monaco editor for Kusto
// that includes fixes required for auto-completion to work.
// Remove this code once Grafana 8.5 is the minimal version supported
function gtGrafana8_5() {
  const version = config.buildInfo.version
  const isValid = valid(version)
  // Assume that a security release will be of the form 'w.x.y.z' - Pre releases of the form 'w.x.y-pre.z' are already valid
  const isSecurityRelease = version.split('.').length > 3
  if (!isValid && isSecurityRelease) {
    // Coerce will drop the z in 'w.x.y.z' leaving just the major-minor-patch version
    const coercedValue = coerce(version)
    return coercedValue ? gte(coercedValue, '8.5.0') : null;
  }
  return isValid && gte(version, '8.5.0');
}

export const RawQueryEditor: React.FC<RawQueryEditorProps> = (props) => {
  const [showLastQuery, setShowLastQuery] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [worker, setWorker] = useState<Worker>();
  const [variables] = useState(getTemplateSrv().getVariables());

  const onRawQueryChange = (kql: string) => {
    const resultFormat = selectResultFormat(props.query.resultFormat, true);

    props.onChange({
      ...props.query,
      query: kql,
      database: props.database,
      resultFormat,
    });
  };

  const onChangeResultFormat = (format: string) => {
    props.onChange({
      ...props.query,
      resultFormat: format,
    });
  };

  const { query, datasource, lastQueryError, lastQuery, timeNotASC, schema } = props;
  const resultFormat = selectResultFormat(query.resultFormat, true);
  const baseUrl = `${config.appSubUrl}/${datasource.meta.baseUrl}`;

  const styles = useStyles2(getStyles);

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
    if (worker && schema) {
      // Populate Database schema with macros
      Object.keys(schema.Databases).forEach((db) =>
        Object.assign(schema.Databases[db].Functions, getFunctions(variables))
      );
      worker.setSchemaFromShowSchema(schema, 'https://help.kusto.windows.net', props.database);
    }
  }, [worker, schema, variables, props.database]);

  if (!schema) {
    return null;
  }

  return (
    <div>
      {gtGrafana8_5() ? (
        <div data-testid={selectors.components.queryEditor.codeEditor.container}>
          <CodeEditor
            language="kusto"
            value={query.query || defaultQuery}
            onBlur={onRawQueryChange}
            showMiniMap={false}
            showLineNumbers={true}
            height="240px"
            onEditorDidMount={handleEditorMount}
          />
        </div>
      ) : (
        <div data-testid={selectors.components.queryEditor.codeEditorLegacy.container}>
          <KustoMonacoEditor
            defaultTimeField="Timestamp"
            pluginBaseUrl={baseUrl}
            content={query.query || defaultQuery}
            getSchema={async () => schema}
            onChange={onRawQueryChange}
            onExecute={props.onRunQuery}
          />
        </div>
      )}

      <div className={styles.toolbar}>
        <QueryEditorResultFormat
          includeAdxTimeFormat={true}
          format={resultFormat}
          onChangeFormat={onChangeResultFormat}
        />
        <div className="gf-form">
          <label className="gf-form-label query-keyword" onClick={() => setShowHelp(!showHelp)}>
            Show Help <Icon name={showHelp ? 'angle-down' : 'angle-right'} />
          </label>
        </div>
        <div className="gf-form">
          <label className="gf-form-label query-keyword" onClick={() => setShowLastQuery(!showLastQuery)}>
            Raw Query <Icon name={showLastQuery ? 'angle-down' : 'angle-right'} />
          </label>
        </div>

        <div className="gf-form gf-form--grow">
          <div className="gf-form-label gf-form-label--grow"></div>
        </div>
      </div>

      {showLastQuery && (
        <div className="gf-form">
          <pre className="gf-form-pre">{lastQuery}</pre>
        </div>
      )}

      {lastQueryError && (
        <div className="gf-form">
          <pre className="gf-form-pre alert alert-error">{lastQueryError}</pre>
        </div>
      )}

      {timeNotASC && (
        <div className="gf-form">
          <pre className="gf-form-pre alert alert-warning">
            Data is not sorted ascending by Time. Recommend adding an order by clause.
          </pre>
        </div>
      )}

      {showHelp && (
        <div className="gf-form">
          <pre className="gf-form-pre alert alert-info">
            {`
  Format as Table:
  - Can return any set of columns.

  Format as Time series:
  - Requires exactly one column of Kusto type datetime. (tip: can use Kusto's project-away operator to remove columns).
  - Requires at least one value column of a number type. Each value column is considered a metric.
  - May optionally have one or more string columns. Each string column is considered as a key=value tag pair (where the key is the column name, and the value is the value of the column for each row).
  - A time series is returned for each value column + unique set of string column values. Each series has name of valueColumnName { stringColumnName=columnValue, ... }. If there are no string columns in the request, the name will just be valueColumnName.
  - Example Time Series Query:
    AzureActivity
      | where $__timeFilter()
      | summarize count() by Category, bin(TimeGenerated, 60min)
      | order by TimeGenerated asc

  Format as ADX Time series:
   - Used for queries that return Kusto's "time series" type, such as the make-series operator
   - Must have a datetime column named "Timestamp"
   - Example ADX Time series query:
    let T = range Timestamp from $__timeFrom to $__timeTo step $__timeInterval * 4
      | extend   Person = dynamic(["Torkel", "Daniel", "Kyle", "Sofia"]) 
      | extend   Place  = dynamic(["EU",     "EU",     "US",   "EU"]) 
      | mvexpand Person, Place
      | extend   HatInventory = rand(5) 
      | project  Timestamp, tostring(Person), tostring(Place), HatInventory;
    T | make-series avg(HatInventory) on Timestamp from $__timeFrom to $__timeTo step $__timeInterval * 4 by Person, Place;


  Time Macros:
  - $__timeFilter -&gt; TimeGenerated &ge; datetime(2018-06-05T18:09:58.907Z) and TimeGenerated &le; datetime(2018-06-05T20:09:58.907Z)
  - $__timeFilter(datetimeColumn) -&gt;  datetimeColumn  &ge; datetime(2018-06-05T18:09:58.907Z) and datetimeColumn &le; datetime(2018-06-05T20:09:58.907Z)
  - $__timeFrom -&gt;  datetime(2018-06-05T18:09:58.907Z) [the start time of the query]
  - $__timeTo -&gt; datetime(2018-06-05T20:09:58.907Z) [the end time of the query]
  - $__timeInterval -&gt; 5000ms [Grafana's recommended bin size based on the timespan of the query, in ms]

  Templating Macros:
  - $__escapeMulti($myTemplateVar) -&gt; $myTemplateVar should be a multi-value template variables that contains illegal characters
  - $__contains(aColumn, $myTemplateVar) -&gt; aColumn in ($myTemplateVar)
    If using the All option, then check the Include All Option checkbox and in the Custom all value field type in: all. If All is chosen -&gt; 1 == 1

  Macro Examples:
  - ¡ where $__timeFilter()
  - | where TimeGenerated &ge; $__timeFrom() and TimeGenerated &le; $__timeTo()
  - | summarize count() by Category, bin(TimeGenerated, $__timeInterval)`}
          </pre>
        </div>
      )}
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  toolbar: css`
    display: flex;
    flex-direction: row;
    margin-top: 4px;
  `,
});
