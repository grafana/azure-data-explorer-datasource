import React, { useCallback } from 'react';
import { Select } from '@grafana/ui';
import { QueryEditorOperatorExpression } from '../types';
import { QueryEditorOperatorDefinition } from '../../types';
import { SelectableValue } from '@grafana/data';
import { QueryEditorExpressionType } from '../../../types';

interface Props {
  value: boolean | undefined;
  onChange: (expression: QueryEditorBoolOperatorExpression) => void;
  operator: QueryEditorOperatorDefinition;
}

export interface QueryEditorBoolOperatorExpression extends QueryEditorOperatorExpression {
  value: boolean;
}

const options: Array<SelectableValue<boolean>> = [
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

  return <Select width={15} options={options} value={props.value} onChange={onChange} menuPlacement="bottom" />;
};

export const isBoolOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorBoolOperatorExpression => {
  return typeof (expression as QueryEditorBoolOperatorExpression)?.value === 'boolean';
};
