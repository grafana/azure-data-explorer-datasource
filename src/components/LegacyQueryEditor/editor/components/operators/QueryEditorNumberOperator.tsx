import React, { useCallback, useState } from 'react';
import { Input } from '@grafana/ui';
import { QueryEditorOperatorDefinition, QueryEditorOperator } from '../../../../../schema/types';

interface Props {
  value: number | undefined;
  onChange: (operator: QueryEditorOperator<number>) => void;
  operator: QueryEditorOperatorDefinition;
}

export const QueryEditorNumberOperator: React.FC<Props> = (props) => {
  const [value, setValue] = useState<string>(String(props.value ?? 0));
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
        value: parseToNumber(event.currentTarget.value),
      });
    },
    [onChange, operatorValue]
  );

  return <Input width={30} value={value} onChange={onChangeInput} onBlur={onBlurInput} />;
};

const parseToNumber = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }

  if (isNaN(value as unknown as number)) {
    return 0;
  }

  return parseInt(value, 10);
};
