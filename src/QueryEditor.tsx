import React, { PureComponent } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import {
  KustoFromEditorSection,
  KustoWhereEditorSection,
  KustoValueColumnEditorSection,
  KustoGroupByEditorSection,
} from 'QueryEditorSections';
import { DatabaseSelect } from './editor/components/database/DatabaseSelect';
import { AdxDataSource } from 'datasource';
import { KustoQuery, AdxDataSourceOptions, QueryEditorSectionExpression, AdxSchema } from 'types';
import { KustoExpressionParser } from 'KustoExpressionParser';
import { Button, TextArea, Select, HorizontalGroup, stylesFactory, InlineFormLabel, Input } from '@grafana/ui';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from './editor/types';
import { RawQueryEditor } from './RawQueryEditor';
import { css } from 'emotion';

// Hack for issue: https://github.com/grafana/grafana/issues/26512
import {} from '@emotion/core';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface State {
  schema?: AdxSchema;

  databases?: QueryEditorFieldDefinition[];
  tables?: QueryEditorFieldDefinition[];
  columnsByTable?: Record<string, QueryEditorFieldDefinition[]>;
}

export class QueryEditor extends PureComponent<Props, State> {
  state: State = {};

  kustoExpressionParser = new KustoExpressionParser();
  templateVariableOptions: any;

  async componentDidMount() {
    try {
      let { query } = this.props;
      let updateTheQuery = false;

      const schema = await this.props.datasource.getSchema();
      const dbs: QueryEditorFieldDefinition[] = [];
      const tables: QueryEditorFieldDefinition[] = [];
      const columns: Record<string, QueryEditorFieldDefinition[]> = {};

      for (const dbName of Object.keys(schema.Databases)) {
        const db = schema.Databases[dbName];
        dbs.push({
          type: QueryEditorFieldType.String,
          value: dbName,
          label: dbName,
        });

        for (const tableName of Object.keys(db.Tables)) {
          const table = db.Tables[tableName];

          tables.push({
            type: QueryEditorFieldType.String,
            value: tableName,
            label: tableName,
          });

          for (const column of table.OrderedColumns) {
            columns[tableName] = columns[tableName] ?? [];
            columns[tableName].push({
              type: toExpressionType(column.Type),
              value: column.Name,
            });
          }
        }
      }

      // Default first database...
      if (!query.database && dbs.length) {
        const firstDatabase = schema.Databases[Object.keys(schema.Databases)[0]];
        if (firstDatabase && firstDatabase.Name) {
          updateTheQuery = true;
          query = {
            ...query,
            database: firstDatabase.Name,
          };
        }
      }

      // Set the raw mode
      if (isInitialRawMode(this.props) && !query.rawMode) {
        updateTheQuery = true;
        query = {
          ...query,
          rawMode: true,
        };
      }

      if (updateTheQuery) {
        this.onUpdateQuery(query);
      }

      this.templateVariableOptions = {
        label: 'Template Variables',
        expanded: false,
        options: this.props.datasource.variables?.map(toOption) || [],
      };

      this.setState({
        databases: dbs,
        tables,
        columnsByTable: columns,
        schema,
      });
    } catch (error) {
      console.log('error', error);
    }
  }

  onUpdateQuery = (q: KustoQuery, run?: boolean) => {
    // Render the query when the expression changes
    if (q.expression !== this.props.query.expression) {
      const expression = q.expression || {};

      const { columnsByTable } = this.state;
      const columns = columnsByTable![this.kustoExpressionParser.fromTable(expression.from, true)];

      q = {
        ...q,
        query: this.kustoExpressionParser.query(expression, columns),
      };
    }

    this.props.onChange(q);
    if (run) {
      this.props.onRunQuery();
    }
  };

  onToggleRawMode = () => {
    const { query } = this.props;
    this.props.onChange({
      ...query,
      rawMode: !query.rawMode,
    });
  };

  onDatabaseChanged = (db: string) => {
    this.onUpdateQuery({
      ...this.props.query,
      database: db,
    });
  };

  onFromChanged = (from: QueryEditorSectionExpression) => {
    const { query } = this.props;
    this.onUpdateQuery({
      ...query,
      expression: {
        ...query.expression,
        from,
      },
    });
  };

  onWhereChanged = (where: QueryEditorSectionExpression) => {
    const { query } = this.props;
    this.onUpdateQuery({
      ...query,
      expression: {
        ...query.expression,
        where,
      },
    });
  };

  onReduceChanged = (reduce: QueryEditorSectionExpression) => {
    const { query } = this.props;
    this.onUpdateQuery({
      ...query,
      expression: {
        ...query.expression,
        reduce,
      },
    });
  };

  onGroupByChanged = (groupBy: QueryEditorSectionExpression) => {
    const { query } = this.props;
    this.onUpdateQuery({
      ...query,
      expression: {
        ...query.expression,
        groupBy,
      },
    });
  };

  onResultFormatChanged = (v: SelectableValue<string>) => {
    const { query } = this.props;
    this.onUpdateQuery(
      {
        ...query,
        resultFormat: v.value || 'time_series',
      },
      true
    );
  };

  onAliasChanged = (v: any) => {
    const { query } = this.props;
    this.onUpdateQuery(
      {
        ...query,
        alias: v.currentTarget.value,
      },
      false
    );
  };

  // const onRawModeChange = useCallback(() => {
  //   setRawMode(!props.query.rawMode);
  //   props.onChange({
  //     ...props.query,
  //     rawMode: !props.query.rawMode,
  //   });
  // }, [props, setRawMode]);

  // const [database, setDatabase] = useState<string>(props.query.database);
  // const [from, setFrom] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.from);
  // const [where, setWhere] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.where);
  // const [reduce, setReduce] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.reduce);
  // const [groupBy, setGroupBy] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.groupBy);
  // const [databases, setDatabases] = useState<QueryEditorFieldDefinition[]>([]);
  // const [tables, setTables] = useState<QueryEditorFieldDefinition[]>([]);
  // const [isSchemaLoaded, setIsSchemaLoaded] = useState(false);
  // const [query, setQuery] = useState<string>(props.query.query);
  // const [rawMode, setRawMode] = useState<boolean>(setInitialRawMode(props));
  // const [resultFormat, setResultFormat] = useState<string>(props.query.resultFormat || 'time_series');
  // const [alias, setAlias] = useState<string>(props.query.alias || '');

  // const [columnsByTable, setColumnsByTable] = useState<Record<string, QueryEditorFieldDefinition[]>>({});
  // const kustoExpressionParser = new KustoExpressionParser();
  // const columns = columnsByTable[kustoExpressionParser.fromTable(from, true)];
  // const templateVariableOptions = {
  //   label: 'Template Variables',
  //   expanded: false,
  //   options: props.datasource?.variables?.map(toOption) || [],
  // };

  // // console.log('Persisted expression', props.query.expression);
  // // console.log('Expression to save', { from, where, reduce, groupBy });
  // // console.log('query', kustoExpressionParser.query({ from, where, reduce, groupBy }, columns));

  // useEffect(() => {
  //   (async () => {
  //   })();
  // }, []);

  // const onRawModeChange = useCallback(() => {
  //   setRawMode(!props.query.rawMode);
  //   props.onChange({
  //     ...props.query,
  //     rawMode: !props.query.rawMode,
  //   });
  // }, [props, setRawMode]);

  render() {
    if (!this.state.schema) {
      return <>Loading schema...</>;
    }
    const { query } = this.props;
    const { databases, tables } = this.state;

    // Proces the raw mode
    if (query.rawMode) {
      return (
        <RawQueryEditor
          {...this.props}
          onRawModeChange={this.onToggleRawMode}
          templateVariableOptions={this.templateVariableOptions}
        />
      );
    }

    const { database, expression, alias, resultFormat } = query;
    const { from, where, reduce, groupBy } = expression || {};

    const { columnsByTable } = this.state;
    const columns = columnsByTable![this.kustoExpressionParser.fromTable(from, true)];

    const groupable =
      columns?.filter(
        column => column.type === QueryEditorFieldType.DateTime || column.type === QueryEditorFieldType.String
      ) ?? [];

    const styles = getStyles();

    return (
      <>
        <DatabaseSelect
          labelWidth={12}
          databases={databases!}
          templateVariableOptions={this.templateVariableOptions}
          database={database}
          onChange={this.onDatabaseChanged}
        />
        <KustoFromEditorSection
          value={from}
          label="From"
          fields={tables!}
          templateVariableOptions={this.templateVariableOptions}
          onChange={this.onFromChanged}
        />
        <KustoWhereEditorSection
          value={where}
          label="Where (filter)"
          fields={columns}
          templateVariableOptions={this.templateVariableOptions}
          onChange={this.onWhereChanged}
        />
        <KustoValueColumnEditorSection
          value={reduce}
          label="Value columns"
          fields={columns}
          templateVariableOptions={this.templateVariableOptions}
          onChange={this.onReduceChanged}
        />
        <KustoGroupByEditorSection
          value={groupBy}
          label="Group by (summarize)"
          fields={groupable}
          templateVariableOptions={this.templateVariableOptions}
          onChange={this.onGroupByChanged}
        />

        <div className={styles.buttonRow}>
          <HorizontalGroup>
            <div className="gf-form">
              <InlineFormLabel className="query-keyword" width={12}>
                Format as
              </InlineFormLabel>
              <Select options={resultFormats} value={resultFormat} onChange={this.onResultFormatChanged} />
            </div>
            {resultFormat === 'time_series' && (
              <>
                <InlineFormLabel className="query-keyword" width={7}>
                  Alias by
                </InlineFormLabel>
                <Input
                  width={30}
                  type="text"
                  value={alias}
                  placeholder="Naming pattern"
                  onChange={this.onAliasChanged}
                  onBlur={() => {
                    this.props.onRunQuery();
                  }}
                />
              </>
            )}

            <Button onClick={this.onToggleRawMode}>Edit KQL</Button>
            <Button
              onClick={() => {
                this.props.onRunQuery();
              }}
            >
              Run Query (testing button)
            </Button>
          </HorizontalGroup>
        </div>

        <TextArea cols={80} rows={8} value={query.query} disabled={true} />
      </>
    );
  }
}

const resultFormats: Array<SelectableValue<string>> = [
  { label: 'Time series', value: 'time_series' },
  { label: 'Table', value: 'table' },
];

const getStyles = stylesFactory(() => ({
  buttonRow: css`
    padding: 10px 0px;
  `,
}));

const toExpressionType = (kustoType: string): QueryEditorFieldType => {
  // System.Object -> should do a lookup on those fields to flatten out their schema.

  switch (kustoType) {
    case 'System.Double':
    case 'System.Int32':
    case 'System.Int64':
      return QueryEditorFieldType.Number;
    case 'System.DateTime':
      return QueryEditorFieldType.DateTime;
    case 'System.Boolean':
      return QueryEditorFieldType.Boolean;
    default:
      return QueryEditorFieldType.String;
  }
};

const toOption = (value: string) => ({ label: value, value } as SelectableValue<string>);

function isInitialRawMode(props: Props): boolean {
  if (props.query.rawMode === undefined && props.query.query && !props.query.expression?.from) {
    return true;
  }

  return props.query.rawMode || false;
}
