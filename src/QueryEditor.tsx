import React, { PureComponent } from 'react';
import { debounce } from 'lodash';
import { QueryEditorProps, SelectableValue, DataQueryRequest } from '@grafana/data';
import {
  KustoFromEditorSection,
  KustoWhereEditorSection,
  KustoValueColumnEditorSection,
  KustoGroupByEditorSection,
} from 'QueryEditorSections';
import { DatabaseSelect } from './editor/components/database/DatabaseSelect';
import { AdxDataSource } from 'datasource';
import { KustoQuery, AdxDataSourceOptions, QueryExpression } from 'types';
import { KustoExpressionParser } from 'KustoExpressionParser';
import { Button, TextArea, Select, HorizontalGroup, stylesFactory, InlineFormLabel, Input } from '@grafana/ui';
import { QueryEditorPropertyType } from './editor/types';
import { RawQueryEditor } from './RawQueryEditor';
import { css } from 'emotion';

// Hack for issue: https://github.com/grafana/grafana/issues/26512
import {} from '@emotion/core';
import {
  QueryEditorGroupByExpression,
  QueryEditorRepeaterExpression,
  QueryEditorExpressionType,
  QueryEditorExpression,
  QueryEditorArrayExpression,
} from './editor/expressions';
import { AdxSchemaResolver } from './SchemaResolver';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface State {
  schema?: boolean;
  dirty?: boolean;
  lastQueryError?: string;
  lastQuery?: string;
  timeNotASC?: boolean;
}

const defaultQuery: QueryExpression = {
  where: {
    type: QueryEditorExpressionType.And,
    expressions: [],
  },
};

export class QueryEditor extends PureComponent<Props, State> {
  private schemaResolver: AdxSchemaResolver;
  private kustoExpressionParser: KustoExpressionParser;

  constructor(props: Props) {
    super(props);
    this.schemaResolver = new AdxSchemaResolver(props.datasource);
    this.kustoExpressionParser = new KustoExpressionParser(this.schemaResolver);
  }

  state: State = {
    dirty: false,
  };

  templateVariableOptions: any;

  // Check when the query has changed, but not yet run
  componentDidUpdate(oldProps: Props) {
    const { data } = this.props;
    if (oldProps.data !== data) {
      const payload: State = {
        lastQueryError: '',
        lastQuery: '',
        dirty: false,
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

  async componentDidMount() {
    try {
      let query = { ...this.props.query }; // mutable query

      await this.schemaResolver.resolveAndCacheSchema();
      const databases = this.schemaResolver.getDatabases();

      // Default first database...
      if (!query.database && databases.length) {
        if (databases[0] && databases[0].value) {
          query.database = databases[0].value;
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
        schema: true,
      });

      // Update the latest error etc
      this.componentDidUpdate({} as Props);
    } catch (error) {
      console.log('error', error);
    }
  }

  onUpdateQuery = (q: KustoQuery, run?: boolean) => {
    // Render the query when the expression changes
    if (q.expression !== this.props.query.expression) {
      const expression = q.expression || defaultQuery;

      const { database } = this.props.query;
      const table = this.kustoExpressionParser.fromTable(expression.from, true);
      const columns = this.schemaResolver.getColumnsForTable(database, table);

      q = {
        ...q,
        query: this.kustoExpressionParser.query(expression, columns, database),
      };

      console.log('q', q);
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

  onFromChanged = (from: QueryEditorExpression) => {
    const { query } = this.props;

    this.onUpdateQuery(
      this.verifyGroupByTime({
        ...query,
        expression: {
          ...defaultQuery,
          ...query.expression,
          from,
          where: defaultQuery.where,
          groupBy: defaultQuery.groupBy,
          reduce: defaultQuery.reduce,
        },
      })
    );
  };

  onWhereChanged = (where: QueryEditorArrayExpression) => {
    const { query } = this.props;
    this.onUpdateQuery({
      ...query,
      expression: {
        ...defaultQuery,
        ...query.expression,
        where,
      },
    });
  };

  onReduceChanged = (reduce: QueryEditorExpression) => {
    const { query } = this.props;
    this.onUpdateQuery({
      ...query,
      expression: {
        ...defaultQuery,
        ...query.expression,
        reduce,
      },
    });
  };

  onGroupByChanged = (groupBy: QueryEditorExpression) => {
    const { query } = this.props;
    this.onUpdateQuery({
      ...query,
      expression: {
        ...defaultQuery,
        ...query.expression,
        groupBy,
      },
    });
  };

  onResultFormatChanged = (v: SelectableValue<string>) => {
    this.onUpdateQuery(
      this.verifyGroupByTime({
        ...this.props.query,
        resultFormat: v.value || 'time_series',
      }),
      false
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

  verifyGroupByTime(query: KustoQuery): KustoQuery {
    if (!query || query.resultFormat !== 'time_series' || query.rawMode) {
      return query;
    }
    let table = (query.expression?.from as any)?.value;
    if (table && !(query?.expression?.groupBy as any)?.expressions?.length) {
      table = this.kustoExpressionParser.fromTable(query.expression?.from, true);
      const { database } = this.props.query;
      const columns = this.schemaResolver.getColumnsForTable(database, table);
      const timeField = columns?.find(c => c.type === QueryEditorPropertyType.DateTime);
      if (timeField) {
        let reduce = query.expression?.reduce;
        if (!reduce) {
          // Needed so that the summarize renders
          reduce = {
            type: QueryEditorExpressionType.OperatorRepeater,
            typeToRepeat: QueryEditorExpressionType.Reduce,
            expressions: [],
          } as QueryEditorRepeaterExpression;
        }

        const groupBy = {
          type: QueryEditorExpressionType.OperatorRepeater,
          typeToRepeat: QueryEditorExpressionType.GroupBy,
          expressions: [
            {
              type: QueryEditorExpressionType.GroupBy,
              property: {
                type: QueryEditorPropertyType.DateTime,
                name: timeField.value,
              },
              interval: {
                type: QueryEditorPropertyType.Interval,
                name: '$__interval',
              },
            } as QueryEditorGroupByExpression,
          ],
        } as QueryEditorRepeaterExpression;

        return {
          ...query,
          expression: {
            ...query.expression!,
            reduce,
            groupBy,
          },
        };
      }
    }
    return query;
  }

  // The debounced version is passed down as properties
  getSuggestions = async (txt: string, skip: QueryEditorExpression): Promise<Array<SelectableValue<string>>> => {
    const { query } = this.props;

    // For now just support finding distinct field values
    const from = this.kustoExpressionParser.fromTable(query.expression?.from);
    const field = (skip as any)?.property?.name;

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

  getSuggestionsNicely = debounce(this.getSuggestions, 250, {
    leading: false,
    trailing: true,
  });

  render() {
    const { query } = this.props;
    const { schema, lastQueryError, lastQuery, dirty } = this.state;

    if (!schema) {
      return <>Loading schema...</>;
    }

    const { database, expression, alias, resultFormat } = query;
    const databases = this.schemaResolver.getDatabases();
    const tables = this.schemaResolver.getTablesForDatabase(database);

    // Proces the raw mode
    if (query.rawMode) {
      return (
        <RawQueryEditor
          {...this.props}
          {...this.state}
          onRawModeChange={this.onToggleRawMode}
          templateVariableOptions={this.templateVariableOptions}
          onAliasChanged={this.onAliasChanged}
          onResultFormatChanged={this.onResultFormatChanged}
          onDatabaseChanged={this.onDatabaseChanged}
          onRawQueryChange={this.onRawQueryChange}
          databases={databases || []}
        />
      );
    }

    const { from, where, reduce, groupBy } = expression || defaultQuery;

    const table = this.kustoExpressionParser.fromTable(from, true);
    const columns = this.schemaResolver.getColumnsForTable(database, table);

    const groupable =
      columns?.filter(
        column => column.type === QueryEditorPropertyType.DateTime || column.type === QueryEditorPropertyType.String
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
              variant={dirty ? 'primary' : 'secondary'}
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
          getSuggestions={this.getSuggestionsNicely}
        />
        <KustoValueColumnEditorSection
          value={reduce}
          label="Value columns"
          fields={columns}
          templateVariableOptions={this.templateVariableOptions}
          onChange={this.onReduceChanged}
          getSuggestions={this.getSuggestionsNicely}
        />
        <KustoGroupByEditorSection
          value={groupBy}
          label="Group by (summarize)"
          fields={groupable}
          templateVariableOptions={this.templateVariableOptions}
          onChange={this.onGroupByChanged}
          getSuggestions={this.getSuggestionsNicely}
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

        <TextArea cols={80} rows={8} value={dirty ? query.query : lastQuery} disabled={true} />

        {lastQueryError && (
          <div className="gf-form">
            <pre className="gf-form-pre alert alert-error">{lastQueryError}</pre>
          </div>
        )}
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

const toOption = (value: string) => ({ label: value, value } as SelectableValue<string>);

function isInitialRawMode(props: Props): boolean {
  if (props.query.rawMode === undefined && props.query.query && !props.query.expression?.from) {
    return true;
  }

  return props.query.rawMode || false;
}
