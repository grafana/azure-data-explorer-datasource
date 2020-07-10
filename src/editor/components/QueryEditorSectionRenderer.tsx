import React from 'react';
import { QueryEditorFieldDefinition, QueryEditorOperatorDefinition, QueryEditorCondition } from '../types';
import { QueryEditorExpression } from './types';
import { QueryEditorField, isField } from './QueryEditorField';
import { isFieldAndOperator, QueryEditorFieldAndOperator } from './QueryEditorFieldAndOperator';
import { isRepeater, QueryEditorRepeater } from './QueryEditorRepeater';

interface Props {
  operators: QueryEditorOperatorDefinition[];
  conditionals: QueryEditorCondition[];
  options: QueryEditorFieldDefinition[];
  expression: QueryEditorExpression | undefined;
  onChange: (expression: QueryEditorExpression | undefined) => void;
}

export const QueryEditorSectionRenderer: React.FC<Props> = props => {
  const { expression, operators, onChange, options } = props;

  if (!expression) {
    return null;
  }

  if (isField(expression)) {
    return <QueryEditorField fields={options} onChange={onChange} />;
  }

  if (isFieldAndOperator(expression)) {
    return <QueryEditorFieldAndOperator operators={operators} fields={options} onChange={onChange} />;
  }

  if (isRepeater(expression)) {
    return (
      <QueryEditorRepeater onChange={onChange} value={expression}>
        {childProps => (
          <QueryEditorSectionRenderer
            {...props}
            key={childProps.key}
            options={options}
            onChange={childProps.onChange}
            expression={childProps.value}
          />
        )}
      </QueryEditorRepeater>
    );
  }

  return null;
};
