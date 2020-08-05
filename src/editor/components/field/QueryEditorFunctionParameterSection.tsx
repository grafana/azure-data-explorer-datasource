import React, { useState, useCallback } from 'react';
import { Input } from '@grafana/ui';
import { QueryEditorExpressionType } from '../../../types';
import { QueryEditorFieldType } from '../../types';
import { QueryEditorFunctionParameterExpression } from '../../expressions';

interface Props {
  name: string;
  value: string | undefined;
  fieldType: QueryEditorFieldType;
  description: string;
  onChange: (expression: QueryEditorFunctionParameterExpression) => void;
}

export const QueryEditorFunctionParameterSection: React.FC<Props> = props => {
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
