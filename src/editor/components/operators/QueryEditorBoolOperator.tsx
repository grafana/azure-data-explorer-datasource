import React, { useCallback } from 'react';
import { Select } from '@grafana/ui';
import { QueryEditorExpressionType, QueryEditorOperatorExpression } from '../types';
import { QueryEditorOperatorDefinition } from '../../types';
import { SelectableValue } from '@grafana/data';

interface Props {
  value: boolean | undefined;
  onChange: (expression: QueryEditorBoolOperatorExpression) => void;
  operator: QueryEditorOperatorDefinition;
}

export interface QueryEditorBoolOperatorExpression extends QueryEditorOperatorExpression {
  value: boolean;
}

const options: SelectableValue<boolean>[] = [
  { value: true, label: 'True' },
  { value: false, label: 'False' },
];

export const QueryEditorBoolOperator: React.FC<Props> = props => {
  const onChange = useCallback(
    (selectable: SelectableValue<boolean>) => {
      if (!selectable || typeof selectable.value !== 'boolean') {
        return;
      }

      props.onChange({
        type: QueryEditorExpressionType.Operator,
        operator: props.operator,
        value: selectable.value,
      });
    },
    [props]
  );

  return <Select width={15} options={options} value={props.value} onChange={onChange} />;
};

export const isBoolOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorBoolOperatorExpression => {
  return typeof (expression as QueryEditorBoolOperatorExpression)?.value === 'boolean';
};
