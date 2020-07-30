import React, { PureComponent } from 'react';
import { QueryEditorProps, SelectableValue, DataQueryRequest } from '@grafana/data';
import {
  KustoFromEditorSection,
  KustoWhereEditorSection,
  KustoValueColumnEditorSection,
  KustoGroupByEditorSection,
} from 'QueryEditorSections';
import { DatabaseSelect } from './editor/components/database/DatabaseSelect';
import { AdxDataSource } from 'datasource';
import {
  KustoQuery,
  AdxDataSourceOptions,
  QueryEditorSectionExpression,
  AdxSchema,
  QueryEditorExpression,
} from 'types';
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
  dirty?: boolean;

  databases?: QueryEditorFieldDefinition[];
  tables?: QueryEditorFieldDefinition[];
  columnsByTable?: Record<string, QueryEditorFieldDefinition[]>;
}

export class QueryEditor extends PureComponent<Props, State> {
  state: State = {
    dirty: false,
  };

  kustoExpressionParser = new KustoExpressionParser();
  templateVariableOptions: any;

  // Check when the query has changed, but not yet run
  componentDidUpdate(oldProps: Props) {
    if (oldProps.data !== this.props.data && this.state.dirty) {
      this.setState({ dirty: false });
    }
  }

  async componentDidMount() {
    try {
      const { datasource } = this.props;
      let query = { ...this.props.query }; // mutable query

      const schema = await datasource.getSchema();
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
          query.database = firstDatabase.Name;
        }
      }

      // Set the raw mode
      if (isInitialRawMode(this.props) && !query.rawMode) {
        query.rawMode = true;
      }
      if (!query.resultFormat) {
        query.resultFormat = 'time_series';
      }
      this.onUpdateQuery(query);

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
    } else {
      this.setState({ dirty: true });
    }
  };

  onToggleRawMode = () => {
    const { query } = this.props;
    this.props.onChange({
      ...query,
      rawMode: !query.rawMode,
    });
  };

  onRawQueryChange = (kql: string) => {
    this.onUpdateQuery({
      ...this.props.query,
      query: kql,
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

  // ExpressionSuggestor
  getSuggestions = async (txt: string, skip: QueryEditorExpression): Promise<Array<SelectableValue<string>>> => {
    const { query } = this.props;

    // For now just support finding distinct field values
    const from = (query.expression?.from?.expression as any)?.value;
    const field = (skip as any)?.field?.value;
    if (!from || !field) {
      return Promise.resolve([]);
    }

    // Covid19
    // | distinct State | order by State  asc | take 5
    // Covid19 |
    //  where  $__timeFilter(Timestamp) | distinct State | order by State asc | take 5

    let kql = `${from}\n`;
    if (txt) {
      kql += `| where ${field} contains "${txt}" `;
    }
    kql += `| distinct ${field} | order by ${field} asc | take 251`;

    const q: KustoQuery = {
      ...query,
      rawMode: true,
      query: kql,
      resultFormat: 'table',
    };

    console.log('Get suggestions', kql);

    return this.props.datasource
      .query({
        targets: [q],
      } as DataQueryRequest<KustoQuery>)
      .toPromise()
      .then(res => {
        if (res.data?.length) {
          return res.data[0].fields[0].values.toArray().map(value => {
            return {
              label: `${value}`,
              value,
            };
          });
        }
        console.log('Got response', kql, res);
        return [];
      });
  };

  render() {
    const { query } = this.props;
    const { schema, databases, tables } = this.state;
    if (!schema) {
      return <>Loading schema...</>;
    }

    // Proces the raw mode
    if (query.rawMode) {
      return (
        <RawQueryEditor
          {...this.props}
          onRawModeChange={this.onToggleRawMode}
          templateVariableOptions={this.templateVariableOptions}
          onAliasChanged={this.onAliasChanged}
          onResultFormatChanged={this.onResultFormatChanged}
          onDatabaseChanged={this.onDatabaseChanged}
          onRawQueryChange={this.onRawQueryChange}
          databases={databases || []}
          dirty={this.state.dirty}
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
        >
          <>
            <div className="gf-form gf-form--grow">
              <div className="gf-form-label--grow" />
            </div>
            <Button onClick={this.onToggleRawMode}>Edit KQL</Button>&nbsp;
            <Button
              variant={this.state.dirty ? 'primary' : 'secondary'}
              onClick={() => {
                this.props.onRunQuery();
              }}
            >
              Run Query
            </Button>
          </>
        </DatabaseSelect>
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
          getSuggestions={this.getSuggestions}
        />
        <KustoValueColumnEditorSection
          value={reduce}
          label="Value columns"
          fields={columns}
          templateVariableOptions={this.templateVariableOptions}
          onChange={this.onReduceChanged}
          getSuggestions={this.getSuggestions}
        />
        <KustoGroupByEditorSection
          value={groupBy}
          label="Group by (summarize)"
          fields={groupable}
          templateVariableOptions={this.templateVariableOptions}
          onChange={this.onGroupByChanged}
          getSuggestions={this.getSuggestions}
        />

        <div className={styles.buttonRow}>
          <HorizontalGroup>
            <div className="gf-form">
              <InlineFormLabel className="query-keyword" width={12}>
                Format as
              </InlineFormLabel>
              <Select options={resultFormats} value={resultFormat} onChange={this.onResultFormatChanged} />
            </div>
            {false && resultFormat === 'time_series' && (
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
