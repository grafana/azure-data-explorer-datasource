import React, { useMemo, useCallback, useEffect } from 'react';
import { useAsync } from 'react-use';
import { QueryEditorProps, PanelData } from '@grafana/data';
// Hack for issue: https://github.com/grafana/grafana/issues/26512
import {} from '@emotion/core';
import { AdxDataSource } from './datasource';
import { KustoQuery, AdxDataSourceOptions, AdxSchema } from 'types';
import { QueryEditorPropertyDefinition } from './editor/types';
import { RawQueryEditor } from './components/RawQueryEditor';
import { databaseToDefinition } from './schema/mapper';
import { VisualQueryEditor } from './components/VisualQueryEditor';
import { QueryEditorToolbar } from './components/QueryEditorToolbar';
import { SchemaLoading } from 'components/SchemaMessages';
import { needsToBeMigrated, migrateQuery } from 'migrations/query';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

export const QueryEditor: React.FC<Props> = props => {
  const { datasource, query } = props;
  const executedQuery = useExecutedQuery(props.data);
  const executedQueryError = useExecutedQueryError(props.data);
  const dirty = useDirty(props.query.query, executedQuery);
  const schema = useAsync(() => datasource.getSchema(), [datasource.id]);
  const databases = useDatabaseOptions(schema.value);
  const database = useSelectedDatabase(databases, query);
  const templateVariables = useTemplateVariables(datasource);
  const rawMode = isRawMode(props);

  useEffect(() => {
    if (needsToBeMigrated(query)) {
      props.onChange(migrateQuery(query));
      props.onRunQuery();
    }
  }, []);

  const onChangeDatabase = useCallback(
    (database: string) => {
      props.onChange({
        ...props.query,
        database,
      });
    },
    [props.onChange, props.query]
  );

  const onToggleEditorMode = useCallback(() => {
    props.onChange({
      ...props.query,
      rawMode: !rawMode,
      querySource: rawMode ? 'visual' : 'raw',
    });
  }, [props.onChange, props.query]);

  if (schema.loading) {
    return <SchemaLoading />;
  }

  if (schema.error) {
    return (
      <div className="gf-form">
        <pre className="gf-form-pre alert alert-error">Could not load datasource schema: {schema.error}</pre>
      </div>
    );
  }

  if (databases.length === 0) {
    return (
      <div className="gf-form">
        <pre className="gf-form-pre alert alert-warning">
          Datasource schema loaded but without any databases and tables, please try again..
        </pre>
      </div>
    );
  }

  const editorMode = rawMode ? 'raw' : 'visual';

  return (
    <>
      {executedQueryError && (
        <div className="gf-form">
          <pre className="gf-form-pre alert alert-warning">Failed to execute query: {executedQueryError}</pre>
        </div>
      )}
      <QueryEditorToolbar
        onRunQuery={props.onRunQuery}
        onToggleEditorMode={onToggleEditorMode}
        editorMode={editorMode}
        onChangeDatabase={onChangeDatabase}
        database={database}
        databases={databases}
        dirty={dirty}
      />
      {editorMode === 'raw' && (
        <RawQueryEditor
          {...props}
          schema={schema.value}
          templateVariableOptions={templateVariables}
          lastQuery={executedQuery}
        />
      )}
      {editorMode === 'visual' && (
        <VisualQueryEditor
          datasource={datasource}
          database={database}
          onChangeQuery={props.onChange}
          query={query}
          schema={schema.value}
          templateVariableOptions={templateVariables}
        />
      )}
    </>
  );
};

const useSelectedDatabase = (options: QueryEditorPropertyDefinition[], query: KustoQuery): string => {
  return useMemo(() => {
    const selected = options.find(option => option.value === query.database);

    if (selected) {
      return selected.value;
    }

    if (options.length > 0) {
      return options[0].value;
    }

    return '';
  }, [options, query.database]);
};

const useDatabaseOptions = (schema?: AdxSchema): QueryEditorPropertyDefinition[] => {
  return useMemo(() => {
    const databases: QueryEditorPropertyDefinition[] = [];

    if (!schema || !schema.Databases) {
      return databases;
    }

    for (const name of Object.keys(schema.Databases)) {
      const database = schema.Databases[name];
      databases.push(databaseToDefinition(database));
    }

    return databases;
  }, [schema]);
};

const useExecutedQuery = (data?: PanelData): string => {
  return useMemo(() => {
    return data?.series[0]?.meta?.executedQueryString ?? '';
  }, [data]);
};

const useDirty = (query: string, executedQuery: string): boolean => {
  return useMemo(() => {
    // we need to interpolate/deinterpolate it so we compare same things.
    return query !== executedQuery;
  }, [query, executedQuery]);
};

const useExecutedQueryError = (data?: PanelData): string | undefined => {
  return useMemo(() => {
    const kustoError = data?.series[0]?.meta?.custom?.KustoError;

    if (data?.error && !kustoError) {
      if (data.error.message) {
        return `${data.error.message}`;
      }
      return `${data.error}`;
    }

    return kustoError;
  }, [data]);
};

const useTemplateVariables = (datasource: AdxDataSource) => {
  return useMemo(() => {
    return {
      label: 'Template Variables',
      expanded: false,
      options: datasource.variables.map(variable => {
        return { label: variable, value: variable };
      }),
    };
  }, [datasource.id]);
};

// export class QueryEditor extends PureComponent<Props, State> {
//   private schemaResolver: AdxSchemaResovler;
//   private kustoExpressionParser: KustoExpressionParser;

//   constructor(props: Props) {
//     super(props);

//     this.schemaResolver = new AdxSchemaResovler(this.props.datasource);
//     this.kustoExpressionParser = new KustoExpressionParser();
//   }

//   state: State = {
//     dirty: false,
//     columns: [],
//     databases: [],
//     tables: [],
//     loadingColumnSchema: false,
//   };

//   templateVariableOptions: any;

//   // Check when the query has changed, but not yet run
//   componentDidUpdate(oldProps: Props) {
//     const { data } = this.props;
//     if (oldProps.data !== data) {
//       const payload: State = {
//         lastQueryError: '',
//         lastQuery: '',
//         dirty: false,
//         columns: this.state.columns,
//         tables: this.state.tables,
//         databases: this.state.databases,
//         loadingColumnSchema: false,
//       };
//       if (data) {
//         if (data.series && data.series.length) {
//           const fristSeriesMeta = data.series[0].meta;
//           if (fristSeriesMeta) {
//             payload.lastQuery = fristSeriesMeta.executedQueryString;
//             payload.timeNotASC = fristSeriesMeta.custom?.TimeNotASC;

//             payload.lastQueryError = fristSeriesMeta.custom?.KustoError;
//           }
//         }

//         if (data.error && !payload.lastQueryError) {
//           if (data.error.message) {
//             payload.lastQueryError = `${data.error.message}`;
//           } else {
//             payload.lastQueryError = `${data.error}`;
//           }
//         }
//       }

//       this.setState(payload);
//     }
//   }

//   async componentDidMount() {
//     try {
//       let query = { ...this.props.query }; // mutable query
//       const databaseSchema = await this.schemaResolver.getDatabases();
//       const databases = databasesToDefinition(databaseSchema);

//       // Default first database...
//       if (!query.database && databases.length) {
//         if (databases[0] && databases[0].value) {
//           query.database = databases[0].value;
//         }
//       }

//       const tableSchema = await this.schemaResolver.getTablesForDatabase(query.database);
//       const table = this.kustoExpressionParser.fromTable(this.props.query.expression?.from);
//       let columnSchema = this.state.columns;

//       if (table) {
//         columnSchema = await this.schemaResolver.getColumnsForTable(query.database, table);
//       }

//       // Set the raw mode
//       if (isInitialRawMode(this.props) && !query.rawMode) {
//         query.rawMode = true;
//       }
//       if (!query.resultFormat) {
//         query.resultFormat = 'time_series';
//       }

//       this.onUpdateQuery(query);

//       this.templateVariableOptions = {
//         label: 'Template Variables',
//         expanded: false,
//         options: this.props.datasource.variables?.map(toOption) || [],
//       };

//       this.setState({
//         tables: tableSchema,
//         databases: databaseSchema,
//         columns: columnSchema,
//         schema: true,
//       });

//       // Update the latest error etc
//       this.componentDidUpdate({} as Props);
//     } catch (error) {
//       console.log('error', error);
//     }
//   }

//   onUpdateQuery = (q: KustoQuery, run?: boolean) => {
//     // Render the query when the expression changes
//     if (q.expression !== this.props.query.expression) {
//       const expression = q.expression || defaultQuery;

//       const { database } = this.props.query;
//       const { columns } = this.state;

//       q = {
//         ...q,
//         query: this.kustoExpressionParser.query(expression, columns, database),
//       };
//     }

//     this.props.onChange(q);
//     console.log('onChange', q);
//     if (run) {
//       this.props.onRunQuery();
//       console.log('onRunQuery', q);
//     } else {
//       this.setState({ dirty: true });
//     }
//   };

//   onToggleRawMode = () => {
//     const { query } = this.props;
//     this.props.onChange({
//       ...query,
//       rawMode: !query.rawMode,
//     });
//   };

//   onRawQueryChange = (kql: string) => {
//     this.onUpdateQuery({
//       ...this.props.query,
//       query: kql,
//     });
//   };

//   onDatabaseChanged = (db: string) => {
//     this.onUpdateQuery({
//       ...this.props.query,
//       database: db,
//     });
//   };

//   onFromChanged = async (from: QueryEditorExpression) => {
//     const { query } = this.props;

//     this.onUpdateQuery(
//       this.verifyGroupByTime({
//         ...query,
//         expression: {
//           ...defaultQuery,
//           ...query.expression,
//           from,
//           where: defaultQuery.where,
//           groupBy: defaultQuery.groupBy,
//           reduce: defaultQuery.reduce,
//         },
//       })
//     );

//     this.setState({ ...this.state, loadingColumnSchema: true });
//     const table = this.kustoExpressionParser.fromTable(from);
//     const columns = await this.schemaResolver.getColumnsForTable(query.database, table);
//     this.setState({ ...this.state, columns, loadingColumnSchema: false });
//   };

//   onWhereChanged = (where: QueryEditorArrayExpression) => {
//     const { query } = this.props;
//     this.onUpdateQuery({
//       ...query,
//       expression: {
//         ...defaultQuery,
//         ...query.expression,
//         where,
//       },
//     });
//   };

//   onReduceChanged = (reduce: QueryEditorArrayExpression) => {
//     const { query } = this.props;
//     this.onUpdateQuery({
//       ...query,
//       expression: {
//         ...defaultQuery,
//         ...query.expression,
//         reduce,
//       },
//     });
//   };

//   onGroupByChanged = (groupBy: QueryEditorArrayExpression) => {
//     const { query } = this.props;
//     this.onUpdateQuery({
//       ...query,
//       expression: {
//         ...defaultQuery,
//         ...query.expression,
//         groupBy,
//       },
//     });
//   };

//   onResultFormatChanged = (v: SelectableValue<string>) => {
//     this.onUpdateQuery(
//       this.verifyGroupByTime({
//         ...this.props.query,
//         resultFormat: v.value || 'time_series',
//       }),
//       false
//     );
//   };

//   onAliasChanged = (v: any) => {
//     const { query } = this.props;
//     this.onUpdateQuery(
//       {
//         ...query,
//         alias: v.currentTarget.value,
//       },
//       false
//     );
//   };

//   verifyGroupByTime(query: KustoQuery): KustoQuery {
//     if (!query || query.resultFormat !== 'time_series' || query.rawMode) {
//       return query;
//     }
//     let table = (query.expression?.from as any)?.value;
//     if (table && !(query?.expression?.groupBy as any)?.expressions?.length) {
//       table = this.kustoExpressionParser.fromTable(query.expression?.from, true);
//       const definitions = columnsToDefinition(this.state.columns);
//       const timeField = definitions?.find(c => c.type === QueryEditorPropertyType.DateTime);
//       if (timeField) {
//         let reduce = query.expression?.reduce;
//         if (!reduce) {
//           // Needed so that the summarize renders
//           reduce = {
//             type: QueryEditorExpressionType.And,
//             expressions: [],
//           } as QueryEditorArrayExpression;
//         }

//         const groupBy: QueryEditorArrayExpression = {
//           type: QueryEditorExpressionType.And,
//           expressions: [
//             {
//               type: QueryEditorExpressionType.GroupBy,
//               property: {
//                 type: QueryEditorPropertyType.DateTime,
//                 name: timeField.value,
//               },
//               interval: {
//                 type: QueryEditorPropertyType.Interval,
//                 name: '$__interval',
//               },
//             } as QueryEditorGroupByExpression,
//           ],
//         };

//         return {
//           ...query,
//           expression: {
//             ...query.expression!,
//             reduce,
//             groupBy,
//           },
//         };
//       }
//     }
//     return query;
//   }

//   // The debounced version is passed down as properties
//   getSuggestions = async (txt: string, skip?: QueryEditorProperty): Promise<Array<SelectableValue<string>>> => {
//     const { query } = this.props;

//     // For now just support finding distinct field values
//     const from = this.kustoExpressionParser.fromTable(query.expression?.from);
//     const field = skip?.name;

//     if (!from || !field) {
//       return Promise.resolve([]);
//     }

//     // Covid19
//     // | distinct State | order by State  asc | take 5
//     // Covid19 |
//     //  where  $__timeFilter(Timestamp) | distinct State | order by State asc | take 5

//     let kql = `${from}\n`;
//     if (txt) {
//       kql += `| where ${field} contains "${txt}" `;
//     }
//     kql += `| distinct ${field} | order by ${field} asc | take 251`;

//     const q: KustoQuery = {
//       ...query,
//       rawMode: true,
//       query: kql,
//       resultFormat: 'table',
//     };

//     console.log('Get suggestions', kql);

//     return this.props.datasource
//       .query({
//         targets: [q],
//       } as DataQueryRequest<KustoQuery>)
//       .toPromise()
//       .then(res => {
//         if (res.data?.length) {
//           return res.data[0].fields[0].values.toArray().map(value => {
//             return {
//               label: `${value}`,
//               value,
//             };
//           });
//         }
//         console.log('Got response', kql, res);
//         return [];
//       });
//   };

//   getSuggestionsNicely = debounce(this.getSuggestions, 300, {
//     leading: false,
//   });

//   render() {
//     const { query } = this.props;
//     const { schema, lastQueryError, lastQuery, dirty } = this.state;

//     if (!schema) {
//       return <>Loading schema...</>;
//     }

//     const { database, expression, alias, resultFormat } = query;
//     const databases = databasesToDefinition(this.state.databases);

//     // Proces the raw mode
//     if (query.rawMode) {
//       return (
//         <RawQueryEditor
//           {...this.props}
//           {...this.state}
//           onRawModeChange={this.onToggleRawMode}
//           templateVariableOptions={this.templateVariableOptions}
//           onAliasChanged={this.onAliasChanged}
//           onResultFormatChanged={this.onResultFormatChanged}
//           onDatabaseChanged={this.onDatabaseChanged}
//           onRawQueryChange={this.onRawQueryChange}
//           databases={databases}
//         />
//       );
//     }

//     const { from, where, reduce, groupBy } = expression || defaultQuery;
//     const tables = tablesToDefinition(this.state.tables);
//     const columns = columnsToDefinition(this.state.columns);

//     if (this.state.loadingColumnSchema) {
//       return (
//         <>
//           <DatabaseSelect
//             labelWidth={12}
//             databases={databases!}
//             templateVariableOptions={this.templateVariableOptions}
//             database={database}
//             onChange={this.onDatabaseChanged}
//           >
//             <>
//               <div className="gf-form gf-form--grow">
//                 <div className="gf-form-label--grow" />
//               </div>
//               <Button onClick={this.onToggleRawMode}>Edit KQL</Button>&nbsp;
//               <Button
//                 variant={dirty ? 'primary' : 'secondary'}
//                 onClick={() => {
//                   this.props.onRunQuery();
//                 }}
//               >
//                 Run Query
//               </Button>
//             </>
//           </DatabaseSelect>
//           <KustoFromEditorSection
//             value={from}
//             label="From"
//             fields={tables!}
//             templateVariableOptions={this.templateVariableOptions}
//             onChange={this.onFromChanged}
//           />
//           <span>loading columns schema</span>

//           <TextArea cols={80} rows={8} value={dirty ? query.query : lastQuery} disabled={true} />

//           {lastQueryError && (
//             <div className="gf-form">
//               <pre className="gf-form-pre alert alert-error">{lastQueryError}</pre>
//             </div>
//           )}
//         </>
//       );
//     }

//     const groupable =
//       columns?.filter(
//         column => column.type === QueryEditorPropertyType.DateTime || column.type === QueryEditorPropertyType.String
//       ) ?? [];

//     const styles = getStyles();

//     return (
//       <>
//         <DatabaseSelect
//           labelWidth={12}
//           databases={databases!}
//           templateVariableOptions={this.templateVariableOptions}
//           database={database}
//           onChange={this.onDatabaseChanged}
//         >
//           <>
//             <div className="gf-form gf-form--grow">
//               <div className="gf-form-label--grow" />
//             </div>
//             <Button onClick={this.onToggleRawMode}>Edit KQL</Button>&nbsp;
//             <Button
//               variant={dirty ? 'primary' : 'secondary'}
//               onClick={() => {
//                 this.props.onRunQuery();
//               }}
//             >
//               Run Query
//             </Button>
//           </>
//         </DatabaseSelect>
//         <KustoFromEditorSection
//           value={from}
//           label="From"
//           fields={tables!}
//           templateVariableOptions={this.templateVariableOptions}
//           onChange={this.onFromChanged}
//         />
//         <KustoWhereEditorSection
//           value={where ?? defaultQuery.where}
//           label="Where (filter)"
//           fields={columns}
//           templateVariableOptions={this.templateVariableOptions}
//           onChange={this.onWhereChanged}
//           getSuggestions={this.getSuggestionsNicely}
//         />
//         <KustoValueColumnEditorSection
//           value={reduce ?? defaultQuery.reduce}
//           label="Value columns"
//           fields={columns}
//           templateVariableOptions={this.templateVariableOptions}
//           onChange={this.onReduceChanged}
//           getSuggestions={this.getSuggestionsNicely}
//         />
//         <KustoGroupByEditorSection
//           value={groupBy ?? defaultQuery.groupBy}
//           label="Group by (summarize)"
//           fields={groupable}
//           templateVariableOptions={this.templateVariableOptions}
//           onChange={this.onGroupByChanged}
//           getSuggestions={this.getSuggestionsNicely}
//         />

//         <div className={styles.buttonRow}>
//           <HorizontalGroup>
//             <div className="gf-form">
//               <InlineFormLabel className="query-keyword" width={12}>
//                 Format as
//               </InlineFormLabel>
//               <Select options={resultFormats} value={resultFormat} onChange={this.onResultFormatChanged} />
//             </div>
//             {false && resultFormat === 'time_series' && (
//               <>
//                 <InlineFormLabel className="query-keyword" width={7}>
//                   Alias by
//                 </InlineFormLabel>
//                 <Input
//                   width={30}
//                   type="text"
//                   value={alias}
//                   placeholder="Naming pattern"
//                   onChange={this.onAliasChanged}
//                   onBlur={() => {
//                     this.props.onRunQuery();
//                   }}
//                 />
//               </>
//             )}
//           </HorizontalGroup>
//         </div>

//         <TextArea cols={80} rows={8} value={dirty ? query.query : lastQuery} disabled={true} />

//         {lastQueryError && (
//           <div className="gf-form">
//             <pre className="gf-form-pre alert alert-error">{lastQueryError}</pre>
//           </div>
//         )}
//       </>
//     );
//   }
// }

// const resultFormats: Array<SelectableValue<string>> = [
//   { label: 'Time series', value: 'time_series' },
//   { label: 'Table', value: 'table' },
// ];

// const getStyles = stylesFactory(() => ({
//   buttonRow: css`
//     padding: 10px 0px;
//   `,
// }));

// const toOption = (value: string) => ({ label: value, value } as SelectableValue<string>);

function isRawMode(props: Props): boolean {
  if (props.query.rawMode === undefined && props.query.query && !props.query.expression?.from) {
    return true;
  }
  return props.query.rawMode || false;
}
