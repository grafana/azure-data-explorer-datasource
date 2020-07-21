import React from 'react';
import { QueryEditorFieldDefinition } from '../../types';
import { isFieldAndOperator, QueryEditorFieldAndOperator } from '../filter/QueryEditorFieldAndOperator';
import { isRepeater, QueryEditorRepeater } from '../QueryEditorRepeater';
import { QueryEditorExpression } from '../../../types';
import { isReduce, QueryEditorReduce } from '../reduce/QueryEditorReduce';
import { isGroupBy, QueryEditorGroupBy } from '../groupBy/QueryEditorGroupBy';

interface Props<TConfig> {
  config: TConfig;
  fields: QueryEditorFieldDefinition[];
  expression: QueryEditorExpression | undefined;
  onChange: (expression: QueryEditorExpression | undefined) => void;
}

export function QueryEditorSectionRenderer<T>(props: Props<T>) {
  const { expression, config, onChange, fields } = props;

  if (!expression) {
    return null;
  }

  if (isFieldAndOperator(expression)) {
    // TODO: fix any
    return (
      <QueryEditorFieldAndOperator
        value={expression}
        operators={(config as any).operators}
        fields={fields}
        onChange={onChange}
      />
    );
  }

  if (isReduce(expression)) {
    // TODO: fix any
    return (
      <QueryEditorReduce value={expression} fields={fields} functions={(config as any).functions} onChange={onChange} />
    );
  }

  if (isGroupBy(expression)) {
    // TODO: fix any
    return (
      <QueryEditorGroupBy
        value={expression}
        fields={fields}
        intervals={(config as any).intervals}
        onChange={onChange}
      />
    );
  }

  if (isRepeater(expression)) {
    return (
      <QueryEditorRepeater onChange={onChange} value={expression}>
        {childProps => (
          <QueryEditorSectionRenderer
            {...props}
            fields={fields}
            onChange={childProps.onChange}
            expression={childProps.value}
          />
        )}
      </QueryEditorRepeater>
    );
  }

  return null;
}
