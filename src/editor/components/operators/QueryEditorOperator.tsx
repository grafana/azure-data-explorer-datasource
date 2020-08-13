import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { Select, stylesFactory, Button } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition } from '../../types';
import { QueryEditorMultiOperator } from './QueryEditorMultiOperator';
import { QueryEditorSingleOperator } from './QueryEditorSingleOperator';
import { QueryEditorBoolOperator } from './QueryEditorBoolOperator';
import { QueryEditorOperatorExpression } from '../../expressions';
import { isMultiOperator, isBoolOperator, isSingleOperator } from '../../guards';

interface Props {
  value?: QueryEditorOperatorExpression;
  operators: QueryEditorOperatorDefinition[];
  onChange: (expression: QueryEditorOperatorExpression) => void;
  getSuggestions: ExpressionSuggestor;
  templateVariableOptions: SelectableValue<string>;
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
    const { operators, value, getSuggestions, templateVariableOptions } = this.props;
    const styles = getStyles();
    const { operator } = value!;

    return (
      <>
        <div className={styles.button}>
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
        {renderOperatorInput(operator, value, this.onChangeValue, getSuggestions, templateVariableOptions)}
      </>
    );
  }
}

const renderOperatorInput = (
  operator: QueryEditorOperatorDefinition | undefined,
  value: QueryEditorOperatorExpression | undefined,
  onChangeValue: (expression: QueryEditorOperatorExpression) => void,
  getSuggestions: ExpressionSuggestor,
  templateVariableOptions: SelectableValue<string>,
) => {
  if (!operator) {
    return null;
  }

  const styles = getStyles();

  if (operator.multipleValues && (isMultiOperator(value) || !value)) {
    return (
      <div className={styles.container}>
        <QueryEditorMultiOperator
          operator={operator}
          values={value?.values ?? []}
          onChange={onChangeValue}
          getSuggestions={getSuggestions}
          expression={value!}
          templateVariableOptions={templateVariableOptions}
        />
      </div>
    );
  }

  if (operator.booleanValues && (isBoolOperator(value) || !value)) {
    return (
      <div className={styles.container}>
        <QueryEditorBoolOperator operator={operator} value={value?.value} onChange={onChangeValue} />
      </div>
    );
  }

  if (!operator.multipleValues && (isSingleOperator(value) || !value)) {
    return (
      <div className={styles.container}>
        <QueryEditorSingleOperator
          operator={operator}
          value={value?.value}
          onChange={onChangeValue}
          getSuggestions={getSuggestions}
          expression={value!}
          templateVariableOptions={templateVariableOptions}
        />
      </div>
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
      margin-right: 4px;
    `,
    button: css`
      margin-right: 4px;
      margin-left: 4px;
    `,
  };
});
