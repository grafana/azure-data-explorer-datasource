import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { Alert } from '@grafana/ui';
import { EditorRows } from '@grafana/experimental';
import { AdxDataSource } from 'datasource';
import React, { useMemo, useState, useEffect } from 'react';
import { useAsync } from 'react-use';
import { AdxSchemaResolver } from 'schema/AdxSchemaResolver';
import { QueryEditorPropertyDefinition } from 'schema/types';
import { AdxColumnSchema, AdxDataSourceOptions, AdxSchema, KustoQuery } from 'types';
import FilterSection from './VisualQueryEditor/FilterSection';
import AggregateSection from './VisualQueryEditor/AggregateSection';
import GroupBySection from './VisualQueryEditor/GroupBySection';
import KQLPreview from './VisualQueryEditor/KQLPreview';
import Timeshift from './VisualQueryEditor/Timeshift';
import TableSection from './VisualQueryEditor/TableSection';
import { filterColumns } from './VisualQueryEditor/utils/utils';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface VisualQueryEditorProps extends Props {
  schema?: AdxSchema;
  database: string;
  templateVariableOptions: SelectableValue<string>;
}

export const VisualQueryEditor: React.FC<VisualQueryEditorProps> = (props) => {
  const templateSrv = getTemplateSrv();
  const { schema, database, datasource, query, onChange } = props;
  const { id: datasourceId, parseExpression, getSchemaMapper } = datasource;
  const databaseName = templateSrv.replace(database);
  const tables = useTableOptions(schema, databaseName, datasource);
  const table = useSelectedTable(tables, query, datasource);
  const tableName = getTemplateSrv().replace(table?.value ?? '');
  const tableMapping = getSchemaMapper().getMappingByValue(table?.value);
  const tableSchema = useAsync(async () => {
    if (!table || !table.value) {
      return [];
    }

    const name = tableMapping?.value ?? tableName;
    return await getTableSchema(datasource, databaseName, name);
  }, [datasourceId, databaseName, tableName, tableMapping?.value]);
  const [tableColumns, setTableColumns] = useState<AdxColumnSchema[]>([]);

  useEffect(() => {
    setTableColumns(filterColumns(tableSchema.value, query.expression?.columns) || []);
  }, [tableSchema.value, query.expression?.columns]);

  useEffect(() => {
    if (tableSchema.value?.length) {
      onChange({
        ...query,
        query: parseExpression(query.expression, tableSchema.value),
      });
    }
    // We are only interested on re-parsing if the expression changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.expression, tableSchema.value]);

  if (!schema) {
    return null;
  }

  return (
    <EditorRows>
      {tableSchema.error && (
        <Alert severity="error" title="Could not load table schema">
          {tableSchema.error?.message}
        </Alert>
      )}
      {!tableSchema.loading && tableSchema.value?.length === 0 && (
        <Alert severity="warning" title="Table schema loaded successfully but without any columns" />
      )}
      <TableSection {...props} tableSchema={tableSchema} tables={tables} table={table} />
      <FilterSection {...props} columns={tableColumns} />
      <AggregateSection {...props} columns={tableColumns} />
      <GroupBySection {...props} columns={tableColumns} />
      <Timeshift {...props} />
      <KQLPreview query={props.query.query} />
    </EditorRows>
  );
};

const useTableOptions = (
  schema: AdxSchema | undefined,
  database: string,
  datasource: AdxDataSource
): QueryEditorPropertyDefinition[] => {
  const mapper = datasource.getSchemaMapper();

  return useMemo(() => {
    if (!schema || !schema.Databases) {
      return [];
    }
    return mapper.getTableOptions(schema, database);
  }, [database, schema, mapper]);
};

const useSelectedTable = (
  options: QueryEditorPropertyDefinition[],
  query: KustoQuery,
  datasource: AdxDataSource
): SelectableValue<string> | undefined => {
  const variables = datasource.getVariables();

  const table = query.expression?.from?.property.name;

  return useMemo(() => {
    const selected = options.find((option) => option.value === table);

    if (selected) {
      return selected;
    }

    const variable = variables.find((variable) => variable === table);

    if (variable) {
      return {
        label: variable,
        value: variable,
      };
    }

    if (options.length > 0) {
      return options[0];
    }

    return;
  }, [options, table, variables]);
};

async function getTableSchema(datasource: AdxDataSource, databaseName: string, tableName: string) {
  const schemaResolver = new AdxSchemaResolver(datasource);
  return await schemaResolver.getColumnsForTable(databaseName, tableName);
}
