import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { EditorField, EditorFieldGroup, EditorRow } from '@grafana/plugin-ui';
import { QueryEditorExpressionType } from 'types/expressions';
import React, { useEffect, useState } from 'react';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { AdxColumnSchema, AdxDataSourceOptions, defaultQuery, KustoQuery } from 'types';
import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from 'schema/types';
import { Select } from '@grafana/ui';
import { AdxDataSource } from 'datasource';
import { defaultTimeSeriesColumns, toColumnNames } from './utils/utils';
import { selectors } from 'test/selectors';

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
  const [tableColumns, setTableColumns] = useState(tableSchema.value);

  useEffect(() => {
    if (table?.value && (!query.expression.from || query.expression.from.property.name !== table.value)) {
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
  }, [table?.value, query, onChange]);

  useEffect(() => {
    if (tableSchema.value?.length) {
      setTableColumns(tableSchema.value);
    }
  }, [tableSchema.value]);

  useEffect(() => {
    // For time_series queries, pre-select a set of columns to avoid hitting performance issues when too many
    // columns are selected.
    if (query.resultFormat === 'time_series' && query.expression.columns === undefined && tableColumns?.length) {
      onChange({
        ...query,
        expression: {
          ...query.expression,
          columns: {
            type: QueryEditorExpressionType.Property,
            columns: defaultTimeSeriesColumns(query.expression, tableColumns),
          },
        },
      });
    }
  }, [tableColumns, query, onChange]);

  return (
    <EditorRow>
      <EditorFieldGroup>
        <EditorField label="Table">
          <Select
            aria-label="Table"
            data-testid={selectors.components.queryEditor.tableFrom.input}
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
              // Clean up columns in the state while it reloads
              setTableColumns([]);
            }}
          />
        </EditorField>
        <EditorField
          label="Columns"
          tooltipInteractive={true}
          tooltip={
            <>
              Select a subset of columns for faster results. Time series requires both time and number values, other
              columns are rendered as{' '}
              <a
                href="https://grafana.com/docs/grafana/latest/basics/timeseries-dimensions/"
                target="_blank"
                rel="noreferrer noopener"
              >
                dimensions
              </a>
              .
            </>
          }
        >
          <Select
            aria-label="Columns"
            data-testid={selectors.components.queryEditor.columns.input}
            isMulti
            value={query.expression?.columns?.columns ? query.expression?.columns?.columns : []}
            options={toColumnNames(tableSchema.value || [])
              .map((c) => ({ label: c, value: c }))
              .concat({
                value: templateVariableOptions.value || '',
                label: templateVariableOptions.label || '',
                ...templateVariableOptions,
              })}
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
