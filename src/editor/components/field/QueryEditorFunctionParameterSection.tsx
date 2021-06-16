import React, { useState, useCallback } from 'react';
import { Input } from '@grafana/ui';
import { QueryEditorPropertyType } from '../../types';
import { QueryEditorFunctionParameterExpression, QueryEditorExpressionType } from '../../expressions';

interface Props {
  name: string;
  value: string | undefined;
  fieldType: QueryEditorPropertyType;
  description: string;
  onChange: (expression: QueryEditorFunctionParameterExpression) => void;
}

export const QueryEditorFunctionParameterSection = (props: Props) => {
  const [value, setValue] = useState(props.value ?? '');

  const onChange = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      if (!event || !event.currentTarget) {
        return;
      }
      setValue(event.currentTarget.value);
    },
    [setValue]
  );

  const onBlur = useCallback(() => {
    props.onChange({
      type: QueryEditorExpressionType.FunctionParameter,
      fieldType: props.fieldType,
      value: value,
      name: props.name,
    });
  }, [value, props]);

  return <Input width={20} value={value} placeholder={props.description} onChange={onChange} onBlur={onBlur} />;
};
