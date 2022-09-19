import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { Button } from '@grafana/ui';
import { EditorField, EditorFieldGroup, EditorRow } from '@grafana/experimental';
import { QueryEditorExpressionType } from 'components/LegacyQueryEditor/editor/expressions';
import { AdxDataSource } from 'datasource';
import React from 'react';
import { AdxColumnSchema, AdxDataSourceOptions, KustoQuery } from 'types';
import KQLFilter from './KQLFilter';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface FilterSectionProps extends Props {
  columns: AdxColumnSchema[];
  database: string;
  templateVariableOptions: SelectableValue<string>;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  query,
  onChange,
  datasource,
  columns,
  templateVariableOptions,
}) => {
  return (
    <>
      {query.expression.where.expressions.map((_, i) => (
        <EditorRow key={`filter-${i}`}>
          <EditorFieldGroup>
            <EditorField
              label="Filter group"
              optional={true}
              tooltip="Any of the conditions of the group should return true"
            >
              <KQLFilter
                index={i}
                query={query}
                onChange={onChange}
                datasource={datasource}
                columns={columns}
                templateVariableOptions={templateVariableOptions}
              />
            </EditorField>
          </EditorFieldGroup>
        </EditorRow>
      ))}
      <EditorRow>
        <EditorFieldGroup>
          <EditorField label="Add filter group" optional={true} tooltip="All filter groups should return true">
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => {
                const expr = query.expression.where.expressions.concat({
                  type: QueryEditorExpressionType.Or,
                  expressions: [{ type: QueryEditorExpressionType.Or, expressions: [] }],
                });
                onChange({
                  ...query,
                  expression: {
                    ...query.expression,
                    where: {
                      ...query.expression.where,
                      expressions: expr,
                    },
                  },
                });
              }}
            />
          </EditorField>
        </EditorFieldGroup>
      </EditorRow>
    </>
  );
};

export default FilterSection;
