import React from 'react';
import { QueryEditorFieldDefinition, QueryEditorOperatorDefinition, QueryEditorCondition } from '../../types';
import { QueryEditorExpression } from '../types';
import { isFieldAndOperator, QueryEditorFieldAndOperator } from '../filter/QueryEditorFieldAndOperator';
import { isRepeater, QueryEditorRepeater } from '../QueryEditorRepeater';

interface Props {
  operators: QueryEditorOperatorDefinition[];
  conditionals: QueryEditorCondition[];
  fields: QueryEditorFieldDefinition[];
  expression: QueryEditorExpression | undefined;
  onChange: (expression: QueryEditorExpression | undefined) => void;
}

export const QueryEditorSectionRenderer: React.FC<Props> = props => {
  const { expression, operators, onChange, fields } = props;

  if (!expression) {
    return null;
  }

  if (isFieldAndOperator(expression)) {
    return <QueryEditorFieldAndOperator operators={operators} fields={fields} onChange={onChange} />;
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
};
