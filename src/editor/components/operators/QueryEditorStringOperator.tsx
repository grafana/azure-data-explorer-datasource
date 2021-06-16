import React, { useCallback, useState } from 'react';
import { Input } from '@grafana/ui';
import { QueryEditorOperatorDefinition, QueryEditorOperator } from '../../types';

interface Props {
  value: string | undefined;
  onChange: (operator: QueryEditorOperator<string>) => void;
  operator: QueryEditorOperatorDefinition;
}

export const QueryEditorStringOperator = (props: Props) => {
  const [value, setValue] = useState<string>(props.value ?? '');
  const {
    onChange,
    operator: { value: operatorValue },
  } = props;

  const onChangeInput = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      setValue(event.currentTarget.value);
    },
    [setValue]
  );

  const onBlurInput = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      onChange({
        name: operatorValue,
        value: event.currentTarget.value,
      });
    },
    [onChange, operatorValue]
  );

  return <Input width={30} value={value} onChange={onChangeInput} onBlur={onBlurInput} />;
};
