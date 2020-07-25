import React, { useEffect, useState, useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import {
  KustoFromEditorSection,
  KustoWhereEditorSection,
  KustoValueColumnEditorSection,
  KustoGroupByEditorSection,
} from 'QueryEditorSections';
import { DatabaseSelect } from './editor/components/database/DatabaseSelect';
import { AdxDataSource } from 'datasource';
import { KustoQuery, AdxDataSourceOptions, QueryEditorSectionExpression } from 'types';
import { KustoExpressionParser } from 'KustoExpressionParser';
import { Button, TextArea, Select, HorizontalGroup, stylesFactory, InlineFormLabel, Input } from '@grafana/ui';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from './editor/types';
import { RawQueryEditor } from './RawQueryEditor';
import { css } from 'emotion';

// Hack for issue: https://github.com/grafana/grafana/issues/26512
import {} from '@emotion/core';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

export const QueryEditor: React.FC<Props> = props => {
  const [database, setDatabase] = useState<string>(props.query.database);
  const [from, setFrom] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.from);
  const [where, setWhere] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.where);
  const [reduce, setReduce] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.reduce);
  const [groupBy, setGroupBy] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.groupBy);
  const [databases, setDatabases] = useState<QueryEditorFieldDefinition[]>([]);
  const [tables, setTables] = useState<QueryEditorFieldDefinition[]>([]);
  const [isSchemaLoaded, setIsSchemaLoaded] = useState(false);
  const [query, setQuery] = useState<string>(props.query.query);
  const [rawMode, setRawMode] = useState<boolean>(props.query.rawMode);
  const [resultFormat, setResultFormat] = useState<string>(props.query.resultFormat || 'time_series');
  const [alias, setAlias] = useState<string>(props.query.alias || '');

  const resultFormats: Array<SelectableValue<string>> = [
    { label: 'Time series', value: 'time_series' },
    { label: 'Table', value: 'table' },
  ];
  const [columnsByTable, setColumnsByTable] = useState<Record<string, QueryEditorFieldDefinition[]>>({});
  const kustoExpressionParser = new KustoExpressionParser();
  const columns = columnsByTable[kustoExpressionParser.fromTable(from, true)];
  const templateVariableOptions = {
    label: 'Template Variables',
    expanded: false,
    options: props.datasource?.variables?.map(toOption) || [],
  };

  // console.log('Persisted expression', props.query.expression);
  // console.log('Expression to save', { from, where, reduce, groupBy });
  // console.log('query', kustoExpressionParser.query({ from, where, reduce, groupBy }, columns));

  useEffect(() => {
    (async () => {
      try {
        const schema = await props.datasource.getSchema();
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

        setDatabases(dbs);
        setTables(tables);
        setColumnsByTable(columns);
        setIsSchemaLoaded(true);
      } catch (error) {
        console.log('error', error);
      }
    })();
  }, []);

  const onRawModeChange = useCallback(() => {
    setRawMode(!props.query.rawMode);
    props.onChange({
      ...props.query,
      rawMode: !props.query.rawMode,
    });
  }, [props, setRawMode]);

  const groupable =
    columns?.filter(
      column => column.type === QueryEditorFieldType.DateTime || column.type === QueryEditorFieldType.String
    ) ?? [];

  if (!isSchemaLoaded) {
    return <>Loading schema...</>;
  }

  const styles = getStyles();
  return (
    <>
      {!rawMode && (
        <>
          <DatabaseSelect
            labelWidth={12}
            databases={databases}
            templateVariableOptions={templateVariableOptions}
            database={database}
            onChange={exp => setDatabase(exp)}
          />
          <KustoFromEditorSection
            value={from}
            label="From"
            fields={tables}
            templateVariableOptions={templateVariableOptions}
            onChange={exp => setFrom(exp)}
          />
          <KustoWhereEditorSection
            value={where}
            label="Where (filter)"
            fields={columns}
            templateVariableOptions={templateVariableOptions}
            onChange={exp => {
              setWhere(exp);
            }}
          />
          <KustoValueColumnEditorSection
            value={reduce}
            label="Value columns"
            fields={columns}
            templateVariableOptions={templateVariableOptions}
            onChange={exp => {
              setReduce(exp);
            }}
          />
          <KustoGroupByEditorSection
            value={groupBy}
            label="Group by (summarize)"
            fields={groupable}
            templateVariableOptions={templateVariableOptions}
            onChange={exp => {
              setGroupBy(exp);
            }}
          />
          <div className={styles.buttonRow}>
            <HorizontalGroup>
              <div className="gf-form">
                <InlineFormLabel className="query-keyword" width={12}>
                  Format as
                </InlineFormLabel>
                <Select
                  options={resultFormats}
                  value={resultFormat}
                  onChange={format => {
                    setResultFormat(format.value || 'time_series');
                  }}
                />
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
                    onChange={val => {
                      setAlias(val.currentTarget.value);
                      props.onChange({
                        ...props.query,
                        alias: val.currentTarget.value,
                      });
                    }}
                    onBlur={() => {
                      props.onChange({
                        ...props.query,
                        alias: alias,
                      });
                      props.onRunQuery();
                    }}
                  />
                </>
              )}

              <Button
                onClick={() => {
                  onRawModeChange();
                }}
              >
                Edit KQL
              </Button>
              <Button
                onClick={() => {
                  const query = kustoExpressionParser.query({ from, where, reduce, groupBy }, columns);
                  setQuery(query);

                  props.onChange({
                    ...props.query,
                    resultFormat: resultFormat,
                    database: database,
                    query: query,
                    expression: {
                      from,
                      where,
                      reduce,
                      groupBy,
                    },
                  });

                  props.onRunQuery();
                }}
              >
                Run Query (testing button)
              </Button>
            </HorizontalGroup>
          </div>
          <TextArea cols={80} rows={8} value={query} disabled={true} />
        </>
      )}

      {rawMode && (
        <RawQueryEditor
          {...props}
          onRawModeChange={onRawModeChange}
          templateVariableOptions={templateVariableOptions}
        />
      )}
    </>
  );
};

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
