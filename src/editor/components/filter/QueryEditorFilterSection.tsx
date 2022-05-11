import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Button, InlineFormLabel, Select, useStyles2 } from '@grafana/ui';
import { isFieldAndOperator, isOrExpression } from 'editor/guards';
import React from 'react';

import {
  QueryEditorArrayExpression,
  QueryEditorExpressionType,
  QueryEditorOperatorExpression,
} from '../../expressions';
import { QueryEditorOperatorDefinition, QueryEditorPropertyDefinition } from '../../types';
import { QueryEditorRepeater } from '../QueryEditorRepeater';
import { QueryEditorSection, QueryEditorSectionProps } from '../QueryEditorSection';
import { SearchExpressionSuggestor, SkippableExpressionSuggestor } from '../types';
import { QueryEditorFieldAndOperator } from './QueryEditorFieldAndOperator';

interface FilterSectionConfiguration {
  operators: QueryEditorOperatorDefinition[];
  defaultValue: QueryEditorOperatorExpression;
}

export interface QueryEditorFilterSectionProps extends QueryEditorSectionProps {
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value: QueryEditorArrayExpression;
  onChange: (value: QueryEditorArrayExpression) => void;
  getSuggestions: SearchExpressionSuggestor;
}

export const QueryEditorFilterSection = (
  config: FilterSectionConfiguration
): React.FC<QueryEditorFilterSectionProps> => {
  return function F(props) {
    const styles = useStyles2(getStyles);

    const getSuggestions = (index: string): SkippableExpressionSuggestor => {
      return (search: QueryEditorOperatorExpression) => props.getSuggestions(index, search);
    };

    if (props.value?.expressions?.length === 0) {
      return (
        <QueryEditorSection label={props.label} tooltip={props.tooltip}>
          <Button
            variant="secondary"
            onClick={() => {
              const next: QueryEditorArrayExpression = {
                ...props.value,
                expressions: [
                  {
                    type: QueryEditorExpressionType.Or,
                    expressions: [config.defaultValue],
                  } as QueryEditorArrayExpression,
                ],
              };

              props.onChange(next);
            }}
            icon="plus"
          />
        </QueryEditorSection>
      );
    }

    return (
      <QueryEditorRepeater id="filter-and" value={props.value} onChange={props.onChange}>
        {(filterProps) => {
          if (!isOrExpression(filterProps.value)) {
            return null;
          }

          if (filterProps.value?.expressions?.length === 0) {
            if (filterProps.index > 0) {
              return null;
            }

            return (
              <QueryEditorSection label={props.label} tooltip={props.tooltip}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const expression: QueryEditorArrayExpression = {
                      type: QueryEditorExpressionType.Or,
                      expressions: [config.defaultValue],
                    };

                    filterProps.onChange(expression);
                  }}
                  icon="plus"
                />
              </QueryEditorSection>
            );
          }

          return (
            <QueryEditorSection label={props.label} tooltip={props.tooltip}>
              <div className={styles.container}>
                <QueryEditorRepeater id="filter-or" value={filterProps.value} onChange={filterProps.onChange}>
                  {(operatorProps) => {
                    if (!isFieldAndOperator(operatorProps.value)) {
                      console.log('invalid fieldandoperator-expression');
                      return null;
                    }

                    const isFirst = operatorProps.index === 0;
                    const rowStyles = isFirst ? styles.row : styles.rowWithSpacing;

                    return (
                      <div className={rowStyles}>
                        {!isFirst && (
                          <InlineFormLabel className="query-keyword" width={3}>
                            or
                          </InlineFormLabel>
                        )}
                        <QueryEditorFieldAndOperator
                          value={operatorProps.value}
                          operators={config.operators}
                          fields={props.fields}
                          templateVariableOptions={props.templateVariableOptions}
                          onChange={operatorProps.onChange}
                          getSuggestions={getSuggestions(`${filterProps.index}-${operatorProps.index}`)}
                        />
                        <div className={styles.spacing}>
                          <Button variant="secondary" onClick={operatorProps.onRemove} icon="minus" />
                        </div>
                        {isFirst && (
                          <Select
                            isSearchable={true}
                            options={[
                              {
                                value: 'append-row',
                                label: 'OR - include another option',
                              },
                              {
                                value: 'new-row',
                                label: `AND - add a new "${props.label}" clause`,
                              },
                            ]}
                            onChange={(value) => {
                              if (value?.value === 'append-row') {
                                return operatorProps.onAdd(config.defaultValue);
                              }

                              if (value?.value === 'new-row') {
                                return filterProps.onAdd({
                                  type: QueryEditorExpressionType.Or,
                                  expressions: [config.defaultValue],
                                } as QueryEditorArrayExpression);
                              }
                            }}
                            menuPlacement="bottom"
                            renderControl={React.forwardRef(function F({ value, isOpen, invalid, ...otherProps }, ref) {
                              return <Button {...otherProps} ref={ref} variant="secondary" icon="plus" />;
                            })}
                          />
                        )}
                      </div>
                    );
                  }}
                </QueryEditorRepeater>
              </div>
            </QueryEditorSection>
          );
        }}
      </QueryEditorRepeater>
    );
  };
};

const getStyles = (theme: GrafanaTheme2) => {
  const row = css`
    display: flex;
    flex-direction: row;
  `;

  return {
    container: css`
      display: flex;
      flex-direction: column;
    `,
    row: row,
    rowWithSpacing: css`
      ${row}
      margin-top: 4px;
    `,
    spacing: css`
      margin-right: 4px;
    `,
  };
};
