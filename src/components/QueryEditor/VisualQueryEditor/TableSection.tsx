import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { EditorField, EditorFieldGroup, EditorRow } from '@grafana/experimental';
import { QueryEditorExpressionType } from 'components/LegacyQueryEditor/editor/expressions';
import React, { useEffect } from 'react';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { AdxColumnSchema, AdxDataSourceOptions, defaultQuery, KustoQuery } from 'types';
import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from 'schema/types';
import { Select } from '@grafana/ui';
import { AdxDataSource } from 'datasource';
import { uniq } from 'lodash';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface TableSectionProps extends Props {
  tables: QueryEditorPropertyDefinition[];
  tableSchema: AsyncState<AdxColumnSchema[]>;
  templateVariableOptions: SelectableValue<string>;
  table?: SelectableValue<string>;
}

const TableSection: React.FC<TableSectionProps> = ({
  tables,
  table,
  query,
  tableSchema,
  templateVariableOptions,
  onChange,
}) => {
  const tableOptions = (tables as Array<SelectableValue<string>>).concat(templateVariableOptions);

  useEffect(() => {
    if (table?.value && !query.expression.from) {
      // New table
      onChange({
        ...query,
        expression: {
          ...query.expression,
          from: {
            type: QueryEditorExpressionType.Property,
            property: { type: QueryEditorPropertyType.String, name: table.value },
          },
        },
      });
    }
  });

  return (
    <EditorRow>
      <EditorFieldGroup>
        <EditorField label="Table">
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
                    property: { type: QueryEditorPropertyType.String, name: value || '' },
                  },
                },
              });
            }}
          />
        </EditorField>
        <EditorField label="Columns" tooltip={'Select a subset of columns for faster queries'}>
          <Select
            aria-label="Columns"
            isMulti
            value={query.expression.columns?.columns ? query.expression.columns.columns : []}
            options={uniq(tableSchema.value?.map((c) => c.Name.split('[')[0])).map((c) => ({ label: c, value: c }))}
            placeholder="All"
            onChange={(e) => {
              onChange({
                ...query,
                expression: {
                  ...query.expression,
                  columns: {
                    type: QueryEditorExpressionType.Property,
                    columns: e.map((e) => e.value),
                  },
                },
              });
            }}
          />
        </EditorField>
      </EditorFieldGroup>
    </EditorRow>
  );
};

export default TableSection;
