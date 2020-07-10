import React, { useEffect, useState } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from './editor';
import { KustoFromEditorSection, KustoWhereEditorSection, KustoValueColumnEditorSection } from 'QueryEditorSections';
import { AdxDataSource } from 'datasource';
import { KustoQuery, AdxDataSourceOptions } from 'types';
import { QueryEditorSectionExpression } from './editor/components/QueryEditorSection';
import { KustoExpressionParser } from 'KustoExpressionParser';
import { Button } from '@grafana/ui';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;
const kustoExpressionParser = new KustoExpressionParser();

export const QueryEditor: React.FC<Props> = props => {
  const [from, setFrom] = useState<QueryEditorSectionExpression | undefined>();
  const [where, setWhere] = useState<QueryEditorSectionExpression | undefined>();
  const [reduce, setReduce] = useState<QueryEditorSectionExpression | undefined>();
  const [tables, setTables] = useState<QueryEditorFieldDefinition[]>([]);
  const [columnsByTable, setColumnsByTable] = useState<Record<string, QueryEditorFieldDefinition[]>>({});
  const columns = columnsByTable[kustoExpressionParser.fromTable(from)];

  console.log('where', where);
  console.log('query', kustoExpressionParser.query({ from, where, reduce }));

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
      } catch (error) {
        console.log('error', error);
      }
    })();
  }, []);

  const aggregatable = columns?.filter(column => column.type === QueryEditorFieldType.Number) ?? [];

  return (
    <>
      <KustoFromEditorSection value={from} label="From" fields={tables} onChange={exp => setFrom(exp)} />
      <KustoWhereEditorSection label="Where (filter)" fields={columns} onChange={exp => setWhere(exp)} />
      <KustoValueColumnEditorSection label="Value columns" fields={aggregatable} onChange={exp => setReduce(exp)} />
      <Button
        onClick={() => {
          const query = kustoExpressionParser.query({ from, where, reduce });

          props.onChange({
            refId: `table-Samples-${query}`,
            resultFormat: 'table',
            datasource: props.datasource.name,
            database: 'Samples',
            queryType: 'time_series',
            query: query,
          });

          props.onRunQuery();
        }}
      >
        Run Query (testing button)
      </Button>
    </>
  );
};

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
