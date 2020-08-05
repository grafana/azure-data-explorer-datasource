import React, { useCallback } from 'react';
import { css } from 'emotion';
import { QueryEditorOperatorDefinition, QueryEditorCondition, QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSectionProps, QueryEditorSection } from '../QueryEditorSection';
import { SelectableValue } from '@grafana/data';
import { ExpressionSuggestor } from '../types';
import {
  QueryEditorExpression,
  QueryEditorArrayExpression,
  QueryEditorFieldAndOperatorExpression,
  QueryEditorExpressionType,
} from '../../expressions';
import { isFieldAndOperator, isOrExpression } from 'editor/guards';
import { QueryEditorFieldAndOperator } from './QueryEditorFieldAndOperator';
import { Button, Select, stylesFactory } from '@grafana/ui';

interface FilterSectionConfiguration {
  operators: QueryEditorOperatorDefinition[];
  conditionals: QueryEditorCondition[];
  defaultValue: QueryEditorFieldAndOperatorExpression;
}

export interface QueryEditorFilterSectionProps extends QueryEditorSectionProps {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value: QueryEditorArrayExpression;
  onChange: (value: QueryEditorArrayExpression) => void;
  getSuggestions: ExpressionSuggestor;
}

export const QueryEditorFilterSection = (
  config: FilterSectionConfiguration
): React.FC<QueryEditorFilterSectionProps> => {
  return props => {
    const styles = getStyles();

    if (props.value.expressions.length === 0) {
      return (
        <QueryEditorSection label={props.label}>
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
      <Repeater value={props.value} onChange={props.onChange}>
        {filterProps => {
          if (!isOrExpression(filterProps.value)) {
            console.log('invalid or-expression');
            return null;
          }

          if (filterProps.value.expressions.length === 0) {
            console.log('or-expression is missing');
            // add button to add or-expression/operator expression
            return null;
          }

          return (
            <QueryEditorSection label={props.label}>
              <Repeater value={filterProps.value} onChange={filterProps.onChange}>
                {operatorProps => {
                  if (!isFieldAndOperator(operatorProps.value)) {
                    console.log('invalid fieldandoperator-expression');
                    return null;
                  }

                  const isFirst = operatorProps.index === 0;
                  const containerStyles = isFirst ? styles.container : styles.containerWithLineBreak;

                  return (
                    <div className={containerStyles}>
                      <QueryEditorFieldAndOperator
                        value={operatorProps.value}
                        operators={config.operators}
                        fields={props.fields}
                        templateVariableOptions={props.templateVariableOptions}
                        onChange={operatorProps.onChange}
                        getSuggestions={props.getSuggestions}
                      />
                      <Select
                        isSearchable={true}
                        options={[
                          {
                            value: 'append-row',
                            label: 'Add to this row',
                          },
                          {
                            value: 'new-row',
                            label: `Add a new "${props.label}" row`,
                          },
                        ]}
                        onChange={value => {
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
                        renderControl={React.forwardRef(({ value, isOpen, invalid, ...otherProps }, ref) => {
                          return <Button ref={ref} {...otherProps} variant="secondary" icon="plus" />;
                        })}
                      />
                    </div>
                  );
                }}
              </Repeater>
            </QueryEditorSection>
          );
        }}
      </Repeater>
    );
  };
};

const getStyles = stylesFactory(() => {
  return {
    container: css`
      display: flex;
      flex-direction: row;
    `,
    containerWithLineBreak: css`
      width: 100%;
    `,
  };
});

interface RepeaterProps {
  value: QueryEditorArrayExpression;
  onChange: (value: QueryEditorArrayExpression) => void;
  children: (props: ChildProps) => React.ReactElement | null;
}

interface ChildProps {
  index: number;
  onChange: (value: QueryEditorExpression) => void;
  onRemove: () => void;
  onAdd: (value: QueryEditorExpression) => void;
  value?: QueryEditorExpression;
}

export const Repeater: React.FC<RepeaterProps> = props => {
  const onChange = useCallback(
    (index: number, expression?: QueryEditorExpression) => {
      const { expressions } = props.value;
      const next = Array.from(expressions);

      if (expression) {
        next.splice(index, 1, expression);
      } else {
        next.splice(index, 1);
      }

      props.onChange({
        ...props.value,
        expressions: next,
      });
    },
    [props.children, props.onChange, props.value]
  );

  return (
    <>
      {props.value.expressions.map((value, index) => {
        return (
          <React.Fragment key={index}>
            {props.children({
              index,
              value,
              onChange: (expression: QueryEditorExpression) => onChange(index, expression),
              onAdd: (expression: QueryEditorExpression) => onChange(props.value.expressions.length, expression),
              onRemove: () => onChange(index),
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};
