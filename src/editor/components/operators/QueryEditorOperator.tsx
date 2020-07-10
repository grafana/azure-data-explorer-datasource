import React, { useState, useCallback } from 'react';
import { css } from 'emotion';
import { Select, Button, stylesFactory } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryEditorOperatorExpression, QueryEditorExpressionType, QueryEditorExpression } from '../types';
import { QueryEditorOperatorDefinition } from '../../types';
import { QueryEditorMultiOperator, isMultiOperator } from './QueryEditorMultiOperator';
import { isSingleOperator, QueryEditorSingleOperator } from './QueryEditorSingleOperator';
import { QueryEditorBoolOperator, isBoolOperator } from './QueryEditorBoolOperator';

interface Props {
  value?: QueryEditorOperatorExpression;
  operators: QueryEditorOperatorDefinition[];
  onChange: (expression: QueryEditorOperatorExpression) => void;
}

export const QueryEditorOperator: React.FC<Props> = props => {
  const styles = getStyles();
  const [operator, setOperator] = useState<QueryEditorOperatorDefinition | undefined>(props.operators[0]);
  const [value, setValue] = useState(props.value);
  const operators = useOperatorOptions(props.operators ?? []);

  const onChangeOperator = useCallback(
    (selectable: SelectableValue<string>) => {
      if (selectable && selectable.value) {
        setOperator(props.operators.find(o => o.value === selectable.value));
        setValue(undefined);
      }
    },
    [setOperator, setValue, props.operators]
  );

  const onChangeValue = useCallback(
    (expression: QueryEditorOperatorExpression) => {
      setValue(expression);
      props.onChange(expression);
    },
    [setValue, props.onChange]
  );

  return (
    <>
      <div className={styles.container}>
        <Select
          options={operators}
          value={operator?.value}
          onChange={onChangeOperator}
          renderControl={React.forwardRef(({ value, isOpen, invalid, ...otherProps }, ref) => {
            return (
              <Button variant="secondary" {...otherProps} ref={ref}>
                {operator?.label || operator?.value || ''}
              </Button>
            );
          })}
        />
      </div>
      {renderOperatorInput(operator, value, onChangeValue)}
    </>
  );
};

export const isOperator = (expression: QueryEditorExpression): expression is QueryEditorOperatorExpression => {
  return (expression as QueryEditorOperatorExpression)?.type === QueryEditorExpressionType.Operator;
};

const renderOperatorInput = (
  operator: QueryEditorOperatorDefinition | undefined,
  value: QueryEditorOperatorExpression | undefined,
  onChangeValue: (expression: QueryEditorOperatorExpression) => void
) => {
  if (!operator) {
    return null;
  }

  if (operator.multipleValues && (isMultiOperator(value) || !value)) {
    return <QueryEditorMultiOperator operator={operator} values={value?.values ?? []} onChange={onChangeValue} />;
  }

  if (operator.booleanValues && (isBoolOperator(value) || !value)) {
    return <QueryEditorBoolOperator operator={operator} value={value?.value} onChange={onChangeValue} />;
  }

  if (!operator.multipleValues && (isSingleOperator(value) || !value)) {
    return <QueryEditorSingleOperator operator={operator} value={value?.value} onChange={onChangeValue} />;
  }

  return null;
};

const useOperatorOptions = (options: QueryEditorOperatorDefinition[]): Array<SelectableValue<string>> => {
  return options.map(option => {
    return {
      value: option.value,
      label: option.label ?? option.value,
      description: option.description,
    };
  });
};

const getStyles = stylesFactory(() => {
  return {
    container: css`
      margin-left: 4px;
      margin-right: 4px;
    `,
  };
});
