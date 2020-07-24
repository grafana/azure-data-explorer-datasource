import React, { useEffect, useState, useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import {
  KustoFromEditorSection,
  KustoWhereEditorSection,
  KustoValueColumnEditorSection,
  KustoGroupByEditorSection,
} from 'QueryEditorSections';
import { AdxDataSource } from 'datasource';
import { KustoQuery, AdxDataSourceOptions, QueryEditorSectionExpression } from 'types';
import { KustoExpressionParser } from 'KustoExpressionParser';
import { Button, TextArea, Select, HorizontalGroup, stylesFactory, InlineFormLabel } from '@grafana/ui';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from './editor/types';
import { RawQueryEditor } from './RawQueryEditor';
import { css } from 'emotion';

// Hack for issue: https://github.com/grafana/grafana/issues/26512
import {} from '@emotion/core';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;
const kustoExpressionParser = new KustoExpressionParser();

export const QueryEditor: React.FC<Props> = props => {
  const [from, setFrom] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.from);
  const [where, setWhere] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.where);
  const [reduce, setReduce] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.reduce);
  const [groupBy, setGroupBy] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.groupBy);
  const [tables, setTables] = useState<QueryEditorFieldDefinition[]>([]);
  const [isSchemaLoaded, setIsSchemaLoaded] = useState(false);
  const [query, setQuery] = useState<string>(props.query.query);
  const [rawMode, setRawMode] = useState<boolean>(props.query.rawMode);
  const [resultFormat, setResultFormat] = useState<string>(props.query.resultFormat || 'time_series');

  const resultFormats: Array<SelectableValue<string>> = [
    { label: 'Time series', value: 'time_series' },
    { label: 'Table', value: 'table' },
  ];
  const [columnsByTable, setColumnsByTable] = useState<Record<string, QueryEditorFieldDefinition[]>>({});
  const columns = columnsByTable[kustoExpressionParser.fromTable(from)];

  // console.log('Persisted expression', props.query.expression);
  // console.log('Expression to save', { from, where, reduce, groupBy });
  // console.log('query', kustoExpressionParser.query({ from, where, reduce, groupBy }, columns));

  useEffect(() => {
    (async () => {
      try {
        const schema = await props.datasource.getSchema();
        const tables: QueryEditorFieldDefinition[] = [];
        const columns: Record<string, QueryEditorFieldDefinition[]> = {};

        for (const dbName of Object.keys(schema.Databases)) {
          const db = schema.Databases[dbName];

          for (const tableName of Object.keys(db.Tables)) {
            const table = db.Tables[tableName];

            tables.push({
              type: QueryEditorFieldType.String,
              value: tableName,
              label: `${dbName} / ${tableName}`,
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
          <KustoFromEditorSection value={from} label="From" fields={tables} onChange={exp => setFrom(exp)} />
          <KustoWhereEditorSection
            value={where}
            label="Where (filter)"
            fields={columns}
            onChange={exp => {
              setWhere(exp);
            }}
          />
          <KustoValueColumnEditorSection
            value={reduce}
            label="Value columns"
            fields={columns}
            onChange={exp => {
              setReduce(exp);
            }}
          />
          <KustoGroupByEditorSection
            value={groupBy}
            label="Group by (summarize)"
            fields={groupable}
            onChange={exp => {
              setGroupBy(exp);
            }}
          />
          <div className={styles.buttonRow}>
            <HorizontalGroup>
              <div className="gf-form">
                <InlineFormLabel className="query-keyword" width={12}>
                  Format As
                </InlineFormLabel>
                <Select
                  options={resultFormats}
                  value={resultFormat}
                  onChange={format => {
                    setResultFormat(format.value || 'time_series');
                  }}
                />
              </div>
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
                    datasource: props.datasource.name,
                    database: 'Samples',
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

      {rawMode && <RawQueryEditor {...props} onRawModeChange={onRawModeChange} />}
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
