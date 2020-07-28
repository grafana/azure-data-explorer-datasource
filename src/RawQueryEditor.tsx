import React, { useCallback, useEffect, useState, SetStateAction, Dispatch } from 'react';
import { Button, Select, Input, InlineFormLabel, Icon } from '@grafana/ui';
import { KustoQuery, AdxDataSourceOptions, AdxDatabaseSchema } from 'types';
import { AdxDataSource } from 'datasource';
import { QueryEditorProps, SelectableValue, PanelData } from '@grafana/data';
import { KustoMonacoEditor } from './monaco/KustoMonacoEditor';
import { DatabaseSelect } from './editor/components/database/DatabaseSelect';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface RawQueryEditorProps extends Props {
  onRawModeChange: () => void;
  templateVariableOptions: SelectableValue<string>;
}

export const RawQueryEditor: React.FC<RawQueryEditorProps> = props => {
  const defaultQuery = [
    '//change this to create your own time series query',
    '',
    '<table name>',
    '| where $__timeFilter(Timestamp)',
    '// | summarize count() by <group by column>, bin(Timestamp, $__interval)',
    '// | order by Timestamp asc',
  ].join('\n');

  const [resultFormat, setResultFormat] = useState<string>(props.query.resultFormat || 'time_series');
  const [database, setDatabase] = useState<string>(props.query.database);
  const [databases, setDatabases] = useState<Array<SelectableValue<string>>>([]);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [query, setQuery] = useState<string>(props.query.query ?? defaultQuery);
  const [alias, setAlias] = useState<string>(props.query.alias ?? '');
  const [showLastQuery, setShowLastQuery] = useState<boolean>(true);
  const [lastQueryError, setLastQueryError] = useState<string>('');
  const [lastQuery, setLastQuery] = useState<string>('');
  const [timeNotASC, setTimeNotASC] = useState<boolean>(false);

  const resultFormats: Array<SelectableValue<string>> = [
    { label: 'Time series', value: 'time_series' },
    { label: 'Table', value: 'table' },
    { label: 'ADX Time series', value: 'time_series_adx_series' },
  ];

  useEffect(() => {
    onDataReceived(props.data, props, setLastQueryError, setLastQuery, setTimeNotASC);
  }, [props.data]);

  useEffect(() => {
    (async () => {
      try {
        const schema = await props.datasource.getSchema();
        setDatabases(prepareDatabaseOptions(schema.Databases));
        if (!database && Object.keys(schema.Databases).length > 0) {
          const firstDatabase = schema.Databases[Object.keys(schema.Databases)[0]];
          setDatabase(firstDatabase.Name || '');
        }
      } catch (error) {
        console.log('error', error);
      }
    })();
  }, []);

  const onQueryChange = useCallback(() => {
    props.onChange({
      ...props.query,
      query: query,
    });
  }, [props]);

  const onChange = useCallback(() => {
    props.onChange({
      ...props.query,
      resultFormat: resultFormat,
      alias: alias,
      database: database,
    });
    props.onRunQuery();
  }, [props]);

  const onBlur = useCallback(() => {
    onChange();
  }, [props]);

  return (
    <div>
      <div className="gf-form-inline">
        <DatabaseSelect
          databases={databases}
          templateVariableOptions={props.templateVariableOptions}
          database={database}
          onChange={val => {
            setDatabase(val);
            onChange();
          }}
        />
        <div className="gf-form">
          <div className="width-1"></div>
        </div>
        <div className="gf-form">
          <Button
            className="btn btn-primary width-10"
            onClick={() => {
              onQueryChange();
              props.onRunQuery();
            }}
          >
            Run
          </Button>
        </div>
        <div className="gf-form">
          <label className="gf-form-label">(Run Query: Shift+Enter, Trigger Suggestion: Ctrl+Space)</label>
        </div>
        <div className="gf-form gf-form--grow">
          <div className="gf-form-label gf-form-label--grow"></div>
        </div>
      </div>

      <KustoMonacoEditor
        defaultTimeField="Timestamp"
        pluginBaseUrl={props.datasource.meta.baseUrl}
        content={query}
        getSchema={props.datasource.getSchema.bind(props.datasource)}
        onChange={val => {
          setQuery(val);
          onQueryChange();
        }}
        onExecute={() => {
          onQueryChange();
          props.onRunQuery();
        }}
      />

      <div className="gf-form-inline">
        <div className="gf-form">
          <InlineFormLabel className="query-keyword" width={7}>
            ALIAS BY
          </InlineFormLabel>
          <Input
            width={30}
            type="text"
            value={alias}
            placeholder="Naming pattern"
            onChange={val => {
              setAlias(val.currentTarget.value);
              onChange();
            }}
            onBlur={onBlur}
          />
          <InlineFormLabel className="query-keyword" width={7}>
            Format As
          </InlineFormLabel>
          <Select
            options={resultFormats}
            value={resultFormat}
            width={14}
            onChange={format => {
              setResultFormat(format.value || 'time_series');
              onChange();
            }}
          />
        </div>
        <div className="gf-form">
          <label className="gf-form-label query-keyword" onClick={() => setShowHelp(!showHelp)}>
            Show Help <Icon name={showHelp ? 'angle-down' : 'angle-right'} />
          </label>
        </div>
        <div className="gf-form" ng-show="ctrl.lastQuery">
          <label className="gf-form-label query-keyword" onClick={() => setShowLastQuery(!showLastQuery)}>
            Raw Query <Icon name={showLastQuery ? 'angle-down' : 'angle-right'} />
          </label>
        </div>
        <Button
          onClick={() => {
            props.onRawModeChange();
          }}
        >
          Query Builder
        </Button>
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

function onDataReceived(
  data: PanelData | undefined,
  props: QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>,
  setLastQueryError: Dispatch<SetStateAction<string>>,
  setLastQuery: Dispatch<SetStateAction<string>>,
  setTimeNotASC: Dispatch<SetStateAction<boolean>>
) {
  setLastQueryError('');
  setLastQuery('');
  setTimeNotASC(false);
  if (!data) {
    return;
  }

  if (data.series && data.series.length) {
    const fristSeriesMeta = data.series[0].meta;
    if (fristSeriesMeta) {
      setLastQuery(fristSeriesMeta.executedQueryString as any);
      setTimeNotASC(fristSeriesMeta.custom?.TimeNotASC);

      const err = fristSeriesMeta.custom?.KustoError;
      if(err) {
        setLastQueryError(err)
      }
    }
  }
  
  if (data.error) {
    onDataError(data.error, props, setLastQueryError, setLastQuery);
  }
}

function onDataError(
  err: any,
  props: QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>,
  setLastQueryError: Dispatch<SetStateAction<string>>,
  setLastQuery: Dispatch<SetStateAction<string>>
) {
  if (err.query && err.query.refId && err.query.refId !== props.query.refId) {
    return;
  }

  setLastQuery(err?.query?.query || '');

  if (
    // Get Kusto Error from Backend
    err.data &&
    err.data.results &&
    err.data.results &&
    err.data.results[props.query.refId] &&
    err.data.results[props.query.refId].meta &&
    err.data.results[props.query.refId].meta.KustoError !== ''
  ) {
    setLastQueryError(err.data.results[props.query.refId].meta.KustoError);
    return;
  }

  if (err.error && err.error.data && err.error.data.error && err.error.data.error.innererror) {
    if (err.error.data.error.innererror.innererror) {
      setLastQueryError(err.error.data.error.innererror.innererror.message);
    } else {
      setLastQueryError(err.error.data.error.innererror['@message']);
    }
  } else if (err.error && err.error.data && err.error.data.error) {
    setLastQueryError(err.error.data.error.message);
  } else if (err.error && err.error.data) {
    setLastQueryError(err.error.data.message);
  } else if (err.data && err.data.error) {
    setLastQueryError(err.data.error.message);
  } else if (err.data && err.data.message) {
    setLastQueryError(err.data.message);
  } else {
    setLastQueryError(err);
  }
}

const prepareDatabaseOptions = (databases: Record<string, AdxDatabaseSchema>) => {
  const options: Array<SelectableValue<string>> = [];
  for (const dbName of Object.keys(databases)) {
    const db = databases[dbName];
    options.push({ label: db.Name, value: db.Name });
  }

  return options;
};
