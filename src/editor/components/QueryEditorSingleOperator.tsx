import React, { useState, useCallback } from 'react';
import { Input } from '@grafana/ui';
import { QueryEditorExpressionType, QueryEditorOperatorExpression } from './types';
import { QueryEditorOperatorDefinition } from '../types';

interface Props {
  value: string | undefined;
  onChange: (expression: QueryEditorSingleOperatorExpression) => void;
  operator: QueryEditorOperatorDefinition;
}

export interface QueryEditorSingleOperatorExpression extends QueryEditorOperatorExpression {
  value: string;
}

export const QueryEditorSingleOperator: React.FC<Props> = props => {
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
      type: QueryEditorExpressionType.Operator,
      value: value,
      operator: props.operator,
    });
  }, [value, props]);

  return <Input width={30} value={value} onChange={onChange} onBlur={onBlur} />;
};

export const isSingleOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorSingleOperatorExpression => {
  return typeof (expression as QueryEditorSingleOperatorExpression)?.value === 'string';
};
