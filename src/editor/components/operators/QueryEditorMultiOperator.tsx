import React, { useState, useCallback } from 'react';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryEditorExpressionType, QueryEditorOperatorExpression } from '../types';
import { QueryEditorOperatorDefinition } from '../../types';

interface Props {
  values: string[] | undefined;
  onChange: (expression: QueryEditorMultiOperatorExpression) => void;
  operator: QueryEditorOperatorDefinition;
}

export interface QueryEditorMultiOperatorExpression extends QueryEditorOperatorExpression {
  values: string[];
}

export const QueryEditorMultiOperator: React.FC<Props> = props => {
  const [options, setOptions] = useState<SelectableValue<string>[]>([]);
  const onCreate = useCallback(
    (value: string) => {
      if (!value) {
        return;
      }

      setOptions([...options, { value, label: value }]);

      props.onChange({
        type: QueryEditorExpressionType.Operator,
        values: [...props.values, value],
        operator: props.operator,
      });
    },
    [setOptions, props]
  );

  const onChange = useCallback(
    selectable => {
      if (!Array.isArray(selectable)) {
        return;
      }

      props.onChange({
        type: QueryEditorExpressionType.Operator,
        values: selectable.map(s => s.value),
        operator: props.operator,
      });
    },
    [props]
  );

  return (
    <Select
      width={30}
      isMulti={true}
      options={options}
      value={props.values}
      onChange={onChange}
      onCreateOption={onCreate}
      allowCustomValue={true}
    />
  );
};

export const isMultiOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorMultiOperatorExpression => {
  return Array.isArray((expression as QueryEditorMultiOperatorExpression)?.values);
};
