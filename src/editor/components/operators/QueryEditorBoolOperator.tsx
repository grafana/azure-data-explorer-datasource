import React, { useCallback } from 'react';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryEditorOperatorDefinition, QueryEditorOperator } from '../../types';

interface Props {
  value: boolean | undefined;
  onChange: (operator: QueryEditorOperator<boolean>) => void;
  operator: QueryEditorOperatorDefinition;
}

const options: Array<SelectableValue<boolean>> = [
  { value: true, label: 'True' },
  { value: false, label: 'False' },
];

export const QueryEditorBoolOperator = (props: Props) => {
  const onChange = useCallback(
    (selectable: SelectableValue<boolean>) => {
      if (!selectable || typeof selectable.value !== 'boolean') {
        return;
      }

      props.onChange({
        name: props.operator.value,
        value: selectable.value,
      });
    },
    [props]
  );

  return <Select width={15} options={options} value={props.value} onChange={onChange} menuPlacement="bottom" />;
};
