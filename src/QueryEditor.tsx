import React, { useEffect, useState } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { KustoFromEditorSection, KustoWhereEditorSection, KustoValueColumnEditorSection } from 'QueryEditorSections';
import { AdxDataSource } from 'datasource';
import { KustoQuery, AdxDataSourceOptions, QueryEditorSectionExpression } from 'types';
import { KustoExpressionParser } from 'KustoExpressionParser';
import { Button } from '@grafana/ui';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from './editor/types';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;
const kustoExpressionParser = new KustoExpressionParser();

export const QueryEditor: React.FC<Props> = props => {
  const [from, setFrom] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.from);
  const [where, setWhere] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.where);
  const [reduce, setReduce] = useState<QueryEditorSectionExpression | undefined>(props.query.expression?.reduce);
  const [tables, setTables] = useState<QueryEditorFieldDefinition[]>([]);
  const [isSchemaLoaded, setIsSchemaLoaded] = useState(false);

  const [columnsByTable, setColumnsByTable] = useState<Record<string, QueryEditorFieldDefinition[]>>({});
  const columns = columnsByTable[kustoExpressionParser.fromTable(from)];

  console.log('Expression', props.query.expression);
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
        setIsSchemaLoaded(true);
      } catch (error) {
        console.log('error', error);
      }
    })();
  }, []);

  const aggregatable = columns?.filter(column => column.type === QueryEditorFieldType.Number) ?? [];

  if (!isSchemaLoaded) {
    return <>'Loading schema...'</>;
  }

  return (
    <>
      <KustoFromEditorSection value={from} label="From" fields={tables} onChange={exp => setFrom(exp)} />
      <KustoWhereEditorSection value={where} label="Where (filter)" fields={columns} onChange={exp => setWhere(exp)} />
      <KustoValueColumnEditorSection
        value={reduce}
        label="Value columns"
        fields={aggregatable}
        onChange={exp => setReduce(exp)}
      />
      <Button
        onClick={() => {
          const query = kustoExpressionParser.query({ from, where, reduce });

          props.onChange({
            ...props.query,
            resultFormat: 'table',
            datasource: props.datasource.name,
            database: 'Samples',
            queryType: 'time_series',
            query: query,
            expression: {
              from,
              where,
              reduce,
            },
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
