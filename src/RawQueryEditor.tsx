import React, { PureComponent } from 'react';
import { Button, Select, InlineFormLabel, Icon } from '@grafana/ui';
import { KustoQuery, AdxDataSourceOptions } from 'types';
import { AdxDataSource } from 'datasource';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { KustoMonacoEditor } from './monaco/KustoMonacoEditor';
import { DatabaseSelect } from './editor/components/database/DatabaseSelect';
import { QueryEditorFieldDefinition } from 'editor/types';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface RawQueryEditorProps extends Props {
  databases: QueryEditorFieldDefinition[];
  dirty?: boolean;

  onRawQueryChange: (kql: string) => void;
  onAliasChanged: (v: any) => void;
  onResultFormatChanged: (v: SelectableValue<string>) => void;
  onRawModeChange: () => void;
  onDatabaseChanged: (db: string) => void;
  templateVariableOptions: SelectableValue<string>;
}

interface State {
  showLastQuery?: boolean;
  lastQueryError?: string;
  lastQuery?: string;
  timeNotASC?: boolean;
  showHelp?: boolean;
}
const defaultQuery = [
  '//change this to create your own time series query',
  '',
  '<table name>',
  '| where $__timeFilter(Timestamp)',
  '// | summarize count() by <group by column>, bin(Timestamp, $__interval)',
  '// | order by Timestamp asc',
].join('\n');

const resultFormats: Array<SelectableValue<string>> = [
  { label: 'Time series', value: 'time_series' },
  { label: 'Table', value: 'table' },
  { label: 'ADX Time series', value: 'time_series_adx_series' },
];

export class RawQueryEditor extends PureComponent<RawQueryEditorProps, State> {
  state: State = {};

  componentDidMount() {
    this.componentDidUpdate({} as Props); // set the initial states
  }

  componentDidUpdate(oldProps: Props) {
    const { data } = this.props;
    if (oldProps.data !== data) {
      const payload: State = {
        lastQueryError: '',
        lastQuery: '',
        timeNotASC: false,
      };
      if (data) {
        if (data.series && data.series.length) {
          const fristSeriesMeta = data.series[0].meta;
          if (fristSeriesMeta) {
            payload.lastQuery = fristSeriesMeta.executedQueryString;
            payload.timeNotASC = fristSeriesMeta.custom?.TimeNotASC;

            payload.lastQueryError = fristSeriesMeta.custom?.KustoError;
          }
        }

        if (data.error && !payload.lastQueryError) {
          if (data.error.message) {
            payload.lastQueryError = `${data.error.message}`;
          } else {
            payload.lastQueryError = `${data.error}`;
          }
        }
      }

      this.setState(payload);
    }
  }

  render() {
    const { query, databases, templateVariableOptions, onDatabaseChanged, onRawModeChange, datasource } = this.props;
    const { database, resultFormat } = query;

    const { showLastQuery, lastQueryError, lastQuery, timeNotASC, showHelp } = this.state;

    return (
      <div>
        <DatabaseSelect
          databases={databases}
          templateVariableOptions={templateVariableOptions}
          database={database}
          onChange={onDatabaseChanged}
        >
          <>
            <div className="gf-form">
              <label className="gf-form-label">(Run Query: Shift+Enter, Trigger Suggestion: Ctrl+Space)</label>
            </div>
            <div className="gf-form gf-form--grow">
              <div className="gf-form-label gf-form-label--grow"></div>
            </div>
            <Button onClick={onRawModeChange}>Query Builder</Button>
            &nbsp;
            <Button variant={this.props.dirty ? 'primary' : 'secondary'} onClick={this.props.onRunQuery}>
              Run Query
            </Button>
          </>
        </DatabaseSelect>

        <KustoMonacoEditor
          defaultTimeField="Timestamp"
          pluginBaseUrl={datasource.meta.baseUrl}
          content={query.query || defaultQuery}
          getSchema={datasource.getSchema.bind(datasource)}
          onChange={this.props.onRawQueryChange}
          onExecute={this.props.onRunQuery}
        />

        <div className="gf-form-inline">
          <div className="gf-form">
            {/* <InlineFormLabel className="query-keyword" width={7}>
              ALIAS BY
            </InlineFormLabel>
            <Input
              width={30}
              type="text"
              value={alias}
              placeholder="Naming pattern"
              onChange={this.props.onAliasChanged}
              onBlur={this.props.onRunQuery}
            /> */}
            <InlineFormLabel className="query-keyword" width={7}>
              Format As
            </InlineFormLabel>
            <Select
              options={resultFormats}
              value={resultFormat}
              width={14}
              onChange={this.props.onResultFormatChanged}
            />
          </div>
          <div className="gf-form">
            <label className="gf-form-label query-keyword" onClick={() => this.setState({ showHelp: !showHelp })}>
              Show Help <Icon name={showHelp ? 'angle-down' : 'angle-right'} />
            </label>
          </div>
          <div className="gf-form" ng-show="ctrl.lastQuery">
            <label
              className="gf-form-label query-keyword"
              onClick={() => this.setState({ showLastQuery: !showLastQuery })}
            >
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
  }
}
