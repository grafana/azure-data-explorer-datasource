import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { Alert, Select } from '@grafana/ui';
import { EditorField, EditorFieldGroup, EditorRow, EditorRows } from '@grafana/experimental';
import { QueryEditorExpressionType } from 'components/LegacyQueryEditor/editor/expressions';
import { AdxDataSource } from 'datasource';
import React, { useMemo } from 'react';
import { useAsync } from 'react-use';
import { AdxSchemaResolver } from 'schema/AdxSchemaResolver';
import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from 'schema/types';
import { AdxDataSourceOptions, AdxSchema, defaultQuery, KustoQuery } from 'types';
import FilterSection from './VisualQueryEditor/FilterSection';
import AggregateSection from './VisualQueryEditor/AggregateSection';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface VisualQueryEditorProps extends Props {
  schema?: AdxSchema;
  database: string;
  templateVariableOptions: SelectableValue<string>;
}

export const VisualQueryEditor: React.FC<VisualQueryEditorProps> = (props) => {
  const templateSrv = getTemplateSrv();
  const { schema, database, datasource, query, onChange, templateVariableOptions } = props;
  const { id: datasourceId, parseExpression, getSchemaMapper } = datasource;
  const databaseName = templateSrv.replace(database);
  const tables = useTableOptions(schema, databaseName, datasource);
  const table = useSelectedTable(tables, query, datasource);
  const tableOptions = (tables as Array<SelectableValue<string>>).concat(templateVariableOptions);
  const tableName = getTemplateSrv().replace(table?.value ?? '');
  const tableMapping = getSchemaMapper().getMappingByValue(table?.value);
  const tableSchema = useAsync(async () => {
    if (!table || !table.value) {
      return [];
    }

    const name = tableMapping?.value ?? tableName;
    const schema = await getTableSchema(datasource, databaseName, name);
    const expression = query.expression ?? defaultQuery.expression;
    const newExpression = {
      ...expression,
      from: {
        type: QueryEditorExpressionType.Property,
        property: { type: QueryEditorPropertyType.String, name: table.value },
      },
    };

    onChange({
      ...query,
      expression: newExpression,
      query: parseExpression(newExpression, schema),
    });

    return schema;
  }, [datasourceId, databaseName, tableName, tableMapping?.value]);

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
      <EditorRow>
        <EditorFieldGroup>
          <EditorField label="Table" width={16}>
            <Select
              aria-label="Table"
              isLoading={tableSchema.loading}
              value={table}
              options={tableOptions}
              allowCustomValue
              onChange={({ value }) => {
                onChange({
                  ...query,
                  expression: {
                    ...defaultQuery.expression,
                    from: {
                      type: QueryEditorExpressionType.Property,
                      property: { type: QueryEditorPropertyType.String, name: value },
                    },
                  },
                });
              }}
            />
          </EditorField>
        </EditorFieldGroup>
      </EditorRow>
      <FilterSection {...props} tableSchema={tableSchema} />
      <AggregateSection {...props} tableSchema={tableSchema} />
      {/* TODO: Use proper preview component */}
      <pre>{query.query}</pre>
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
