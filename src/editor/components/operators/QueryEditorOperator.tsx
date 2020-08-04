import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { Select, stylesFactory, Button } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryEditorOperatorExpression, ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition } from '../../types';
import { QueryEditorMultiOperator, isMultiOperator } from './QueryEditorMultiOperator';
import { isSingleOperator, QueryEditorSingleOperator } from './QueryEditorSingleOperator';
import { QueryEditorBoolOperator, isBoolOperator } from './QueryEditorBoolOperator';
import { QueryEditorExpression, QueryEditorExpressionType } from '../../../types';

interface Props {
  value?: QueryEditorOperatorExpression;
  operators: QueryEditorOperatorDefinition[];
  onChange: (expression: QueryEditorOperatorExpression) => void;
  getSuggestions: ExpressionSuggestor;
}

export class QueryEditorOperator extends PureComponent<Props> {
  onChangeOperator = (selectable: SelectableValue<string>) => {
    if (selectable && selectable.value) {
      const v = this.props.operators.find(o => o.value === selectable.value);
      this.props.onChange(
        verifyOperatorValues({
          ...this.props.value!,
          operator: v!,
        })
      );
    }
  };

  onChangeValue = (expression: QueryEditorOperatorExpression) => {
    this.props.onChange(expression);
  };

  render() {
    const { operators, value, getSuggestions } = this.props;
    const styles = getStyles();
    const { operator } = value!;

    return (
      <>
        <div className={styles.container}>
          <Select
            isSearchable={true}
            options={operators}
            value={operator?.value}
            onChange={this.onChangeOperator}
            menuPlacement="bottom"
            renderControl={React.forwardRef(({ value, isOpen, invalid, ...otherProps }, ref) => {
              return (
                <Button ref={ref} {...otherProps} variant="secondary">
                  {operator?.label || operator?.value || '?'}
                </Button>
              );
            })}
          />
        </div>
        {renderOperatorInput(operator, value, this.onChangeValue, getSuggestions)}
      </>
    );
  }
}

export const isOperator = (expression: QueryEditorExpression): expression is QueryEditorOperatorExpression => {
  return (expression as QueryEditorOperatorExpression)?.type === QueryEditorExpressionType.Operator;
};

const renderOperatorInput = (
  operator: QueryEditorOperatorDefinition | undefined,
  value: QueryEditorOperatorExpression | undefined,
  onChangeValue: (expression: QueryEditorOperatorExpression) => void,
  getSuggestions: ExpressionSuggestor
) => {
  if (!operator) {
    return null;
  }

  if (operator.multipleValues && (isMultiOperator(value) || !value)) {
    return (
      <QueryEditorMultiOperator
        operator={operator}
        values={value?.values ?? []}
        onChange={onChangeValue}
        getSuggestions={getSuggestions}
        expression={value!}
      />
    );
  }

  if (operator.booleanValues && (isBoolOperator(value) || !value)) {
    return <QueryEditorBoolOperator operator={operator} value={value?.value} onChange={onChangeValue} />;
  }

  if (!operator.multipleValues && (isSingleOperator(value) || !value)) {
    return (
      <QueryEditorSingleOperator
        operator={operator}
        value={value?.value}
        onChange={onChangeValue}
        getSuggestions={getSuggestions}
        expression={value!}
      />
    );
  }

  return null;
};

export function verifyOperatorValues(exp: QueryEditorOperatorExpression): QueryEditorOperatorExpression {
  const { operator } = exp;
  const untyped: any = exp;

  if (operator.multipleValues) {
    let values: string[] = untyped.values;
    if (!Array.isArray(values)) {
      values = [];
    }
    if (!!!values.length) {
      if (untyped.value) {
        values.push(untyped.value); // keep the old single value
      }
    }
    return {
      ...exp,
      values,
    } as QueryEditorOperatorExpression;
  }

  if (operator.booleanValues) {
    return {
      ...exp,
      value: untyped.value ? true : false,
    } as QueryEditorOperatorExpression;
  }

  return {
    ...exp,
    value: untyped.value ?? '',
  } as QueryEditorOperatorExpression;
}

const getStyles = stylesFactory(() => {
  return {
    container: css`
      margin-left: 4px;
      margin-right: 4px;
    `,
  };
});
