import React, { useEffect, useState } from 'react';
import { InlineFormLabel, Select } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from './editor';
import { KustoFromEditorSection, KustoWhereEditorSection, KustoValueColumnEditorSection } from 'QueryEditorSections';
import { AdxDataSource } from 'datasource';
import { KustoQuery, AdxDataSourceOptions } from 'types';
import { QueryEditorSectionExpression } from './editor/components/QueryEditorSection';
import { KustoExpressionParser } from 'KustoExpressionParser';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;
const kustoExpressionParser = new KustoExpressionParser();

export const QueryEditor: React.FC<Props> = props => {
  const [from, setFrom] = useState<QueryEditorSectionExpression | undefined>();
  const [tables, setTables] = useState<QueryEditorFieldDefinition[]>([]);
  const [columnsByTable, setColumnsByTable] = useState<Record<string, QueryEditorFieldDefinition[]>>({});
  const columns = columnsByTable[kustoExpressionParser.fromTable(from)];

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
      <KustoFromEditorSection value={from} label="From" fields={tables} onChange={expression => setFrom(expression)} />
      <KustoWhereEditorSection label="Where (filter)" fields={columns} onChange={e => console.log('e', e)} />
      <KustoValueColumnEditorSection label="Value columns" fields={aggregatable} onChange={e => console.log('e', e)} />
    </>
  );
};

const toExpressionType = (kustoType: string): QueryEditorFieldType => {
  switch (kustoType) {
    default:
      return QueryEditorFieldType.String;
  }
};

// export class QueryEditor extends PureComponent<Props> {
//   onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
//     const { onChange, query } = this.props;
//     onChange({ ...query, queryText: event.target.value });
//   };

//   onConstantChange = (event: ChangeEvent<HTMLInputElement>) => {
//     const { onChange, query, onRunQuery } = this.props;
//     onChange({ ...query, constant: parseFloat(event.target.value) });
//     // executes the query
//     onRunQuery();
//   };

//   render() {
//     //const query = defaults(this.props.query, defaultQuery);
//     const options: QueryEditorFieldDefinition[] = [
//       {
//         value: 'StormEvents',
//         type: QueryEditorFieldType.String,
//       },
//       {
//         value: 'ConferenceSessions',
//         type: QueryEditorFieldType.String,
//       },
//       {
//         value: 'StormIsComing',
//         type: QueryEditorFieldType.Boolean,
//       },
//       {
//         value: 'Lightning count',
//         type: QueryEditorFieldType.Number,
//       },
//     ];

//     return (
//       <>
//         <KustoFromEditorSection label="From" fields={options} onChange={() => {}} />
//         <KustoWhereEditorSection label="Where (filter)" fields={options} onChange={e => console.log('e', e)} />
//         <KustoValueColumnEditorSection label="Value columns" fields={options} onChange={e => console.log('e', e)} />
//         <div className="gf-form">
//           <InlineFormLabel width={12}>Group by (summarize)</InlineFormLabel>
//           <Select width={30} onChange={() => {}} value={'StormEvents'} options={options} />
//         </div>
//       </>
//     );
//   }
// }
