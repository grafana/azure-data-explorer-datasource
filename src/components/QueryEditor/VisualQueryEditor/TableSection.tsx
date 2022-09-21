import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { EditorField, EditorFieldGroup, EditorRow } from '@grafana/experimental';
import { QueryEditorExpressionType } from 'components/LegacyQueryEditor/editor/expressions';
import React, { useEffect } from 'react';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { AdxColumnSchema, AdxDataSourceOptions, defaultQuery, KustoQuery } from 'types';
import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from 'schema/types';
import { Select } from '@grafana/ui';
import { AdxDataSource } from 'datasource';
import { toColumnNames } from './utils/utils';
import { uniq } from 'lodash';
import { toPropertyType } from 'schema/mapper';

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
    if (table?.value && !query.expression.from && tableSchema.value?.length) {
      // New table
      const timeCol = tableSchema.value?.find((cc) => toPropertyType(cc.CslType) === QueryEditorPropertyType.DateTime);
      const valCol = tableSchema.value?.find((cc) => toPropertyType(cc.CslType) === QueryEditorPropertyType.Number);
      const cols: string[] = [];
      if (timeCol && valCol) {
        cols.push(timeCol.Name, valCol.Name);
      }
      onChange({
        ...query,
        expression: {
          ...query.expression,
          from: {
            type: QueryEditorExpressionType.Property,
            property: { type: QueryEditorPropertyType.String, name: table.value },
          },
          columns: {
            type: QueryEditorExpressionType.Property,
            columns: cols,
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
              // TODO: recalculate cols
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
        {query.resultFormat === 'time_series' ? (
          <>
            <EditorField label="Time column">
              <Select
                aria-label="Time column"
                // TODO: Make columns to include the type
                value={
                  query.expression.columns?.columns
                    ? query.expression.columns?.columns.find((c) => {
                        return tableSchema.value?.find(
                          (cc) => cc.Name === c && toPropertyType(cc.CslType) === QueryEditorPropertyType.DateTime
                        );
                      })
                    : null
                }
                options={uniq(
                  tableSchema.value
                    // TODO: Add support for nested values
                    ?.filter(
                      (c) => toPropertyType(c.CslType) === QueryEditorPropertyType.DateTime && !c.Name.includes('[')
                    )
                    .map((c) => c.Name)
                ).map((c) => ({ label: c, value: c }))}
                placeholder="Choose"
                onChange={(e) => {
                  const previousIndex = query.expression.columns?.columns?.findIndex((c) => {
                    return tableSchema.value?.find(
                      (cc) => cc.Name === c && toPropertyType(cc.CslType) === QueryEditorPropertyType.DateTime
                    );
                  });
                  const newColumns = [...(query.expression.columns?.columns || [])];
                  if (previousIndex !== undefined && previousIndex > -1) {
                    newColumns[previousIndex] = e.value || '';
                  } else {
                    newColumns.push(e.value || '');
                  }
                  onChange({
                    ...query,
                    expression: {
                      ...query.expression,
                      columns: {
                        type: QueryEditorExpressionType.Property,
                        columns: newColumns,
                      },
                    },
                  });
                }}
              />
            </EditorField>
            <EditorField label="Value column">
              <Select
                aria-label="Value column"
                // TODO: Make columns to include the type
                value={
                  query.expression.columns?.columns
                    ? query.expression.columns?.columns.find((c) => {
                        return tableSchema.value?.find(
                          (cc) => cc.Name === c && toPropertyType(cc.CslType) === QueryEditorPropertyType.Number
                        );
                      })
                    : null
                }
                options={uniq(
                  tableSchema.value
                    // TODO: Add support for nested values
                    ?.filter(
                      (c) => toPropertyType(c.CslType) === QueryEditorPropertyType.Number && !c.Name.includes('[')
                    )
                    .map((c) => c.Name)
                ).map((c) => ({ label: c, value: c }))}
                placeholder="Choose"
                onChange={(e) => {
                  const previousIndex = query.expression.columns?.columns?.findIndex((c) => {
                    return tableSchema.value?.find(
                      (cc) => cc.Name === c && toPropertyType(cc.CslType) === QueryEditorPropertyType.Number
                    );
                  });
                  const newColumns = [...(query.expression.columns?.columns || [])];
                  if (previousIndex !== undefined && previousIndex > -1) {
                    newColumns[previousIndex] = e.value || '';
                  } else {
                    newColumns.push(e.value || '');
                  }
                  onChange({
                    ...query,
                    expression: {
                      ...query.expression,
                      columns: {
                        type: QueryEditorExpressionType.Property,
                        columns: newColumns,
                      },
                    },
                  });
                }}
              />
            </EditorField>
            <EditorField label="Other dimensions" optional>
              <Select
                aria-label="Other dimensions"
                isMulti
                // TODO: Make columns to include the type
                value={
                  query.expression.columns?.columns
                    ? query.expression.columns?.columns.filter((c) => {
                        return tableSchema.value?.find(
                          (cc) =>
                            cc.Name === c &&
                            toPropertyType(cc.CslType) !== QueryEditorPropertyType.Number &&
                            toPropertyType(cc.CslType) !== QueryEditorPropertyType.DateTime
                        );
                      })
                    : undefined
                }
                options={uniq(
                  tableSchema.value
                    ?.filter(
                      (c) =>
                        toPropertyType(c.CslType) !== QueryEditorPropertyType.Number &&
                        toPropertyType(c.CslType) !== QueryEditorPropertyType.DateTime
                    )
                    .map((c) => c.Name.split('[')[0])
                ).map((c) => ({ label: c, value: c }))}
                placeholder="Choose"
                onChange={(e) => {
                  const valueCol = query.expression.columns?.columns?.find((c) => {
                    return tableSchema.value?.find(
                      (cc) => cc.Name === c && toPropertyType(cc.CslType) === QueryEditorPropertyType.Number
                    );
                  });
                  const timeCol = query.expression.columns?.columns?.find((c) => {
                    return tableSchema.value?.find(
                      (cc) => cc.Name === c && toPropertyType(cc.CslType) === QueryEditorPropertyType.DateTime
                    );
                  });
                  const newColumns: string[] = [];
                  if (timeCol) {
                    newColumns.push(timeCol);
                  }
                  if (valueCol) {
                    newColumns.push(valueCol);
                  }
                  newColumns.push(...e.map((e) => e.value));
                  onChange({
                    ...query,
                    expression: {
                      ...query.expression,
                      columns: {
                        type: QueryEditorExpressionType.Property,
                        columns: newColumns,
                      },
                    },
                  });
                }}
              />
            </EditorField>
          </>
        ) : (
          <EditorField label="Columns" tooltip={'Select a subset of columns for faster queries'}>
            <Select
              aria-label="Columns"
              isMulti
              value={query.expression.columns?.columns ? query.expression.columns.columns : []}
              options={toColumnNames(tableSchema.value || []).map((c) => ({ label: c, value: c }))}
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
        )}
      </EditorFieldGroup>
    </EditorRow>
  );
};

export default TableSection;
