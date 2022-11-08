import { GrafanaTheme2, QueryEditorProps, SelectableValue } from '@grafana/data';
import { Button, Label, useStyles2 } from '@grafana/ui';
import { EditorField, EditorFieldGroup, EditorRow } from '@grafana/experimental';
import { QueryEditorExpressionType } from 'components/LegacyQueryEditor/editor/expressions';
import { AdxDataSource } from 'datasource';
import React from 'react';
import { AdxColumnSchema, AdxDataSourceOptions, KustoQuery } from 'types';
import KQLFilter from './KQLFilter';
import { css } from '@emotion/css';

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
  const styles = useStyles2(getStyles);

  return (
    <>
      <EditorRow>
        <EditorFieldGroup>
          <EditorField label="Filters" optional={true}>
            <>
              {query.expression.where.expressions.length ? (
                <div className={styles.filters}>
                  {query.expression.where.expressions.map((_, i) => (
                    <div key={`filter${i}`}>
                      <KQLFilter
                        index={i}
                        query={query}
                        onChange={onChange}
                        datasource={datasource}
                        columns={columns}
                        templateVariableOptions={templateVariableOptions}
                      />
                      {i < query.expression.where.expressions.length - 1 ? (
                        <Label className={styles.andLabel}>AND</Label>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => {
                  const expr = query.expression.where.expressions.concat({
                    type: QueryEditorExpressionType.Or,
                    expressions: [],
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
              >
                Add group
              </Button>
            </>
          </EditorField>
        </EditorFieldGroup>
      </EditorRow>
    </>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    andLabel: css({
      margin: '8px',
    }),
    filters: css({
      marginBottom: '8px',
    }),
  };
};

export default FilterSection;
