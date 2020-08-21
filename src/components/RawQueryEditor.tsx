import React, { PureComponent } from 'react';
import { Icon, stylesFactory } from '@grafana/ui';
import { css } from 'emotion';
import { KustoQuery, AdxDataSourceOptions, AdxSchema } from 'types';
import { AdxDataSource } from 'datasource';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { KustoMonacoEditor } from '../monaco/KustoMonacoEditor';
import { QueryEditorResultFormat } from 'components/QueryEditorResultFormat';

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

interface State {
  showLastQuery?: boolean;
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

export class RawQueryEditor extends PureComponent<RawQueryEditorProps, State> {
  state: State = {};

  onRawQueryChange = (kql: string) => {
    this.props.onChange({
      ...this.props.query,
      query: kql,
      database: this.props.database,
    });
  };

  render() {
    const { query, datasource, lastQueryError, lastQuery, timeNotASC, schema } = this.props;
    const { showLastQuery, showHelp } = this.state;

    const styles = getStyles();

    if (!schema) {
      return null;
    }

    return (
      <div>
        <KustoMonacoEditor
          defaultTimeField="Timestamp"
          pluginBaseUrl={datasource.meta.baseUrl}
          content={query.query || defaultQuery}
          getSchema={async () => schema}
          onChange={this.onRawQueryChange}
          onExecute={this.props.onRunQuery}
        />

        <div className={styles.toolbar}>
          <QueryEditorResultFormat query={query} onChangeQuery={this.props.onChange} />
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

const getStyles = stylesFactory(() => {
  return {
    toolbar: css`
      display: flex;
      flex-direction: row;
      margin-top: 4px;
    `,
  };
});
