import React, { useCallback } from 'react';
import { InlineFormLabel } from '@grafana/ui';
import { QueryEditorExpression } from './types';
import { QueryEditorOperatorDefinition, QueryEditorCondition, QueryEditorFieldDefinition } from '../types';
import { QueryEditorSectionRenderer } from './QueryEditorSectionRenderer';

interface QueryEditorDefaultProps {
  id: string;
  operators: QueryEditorOperatorDefinition[];
  conditionals: QueryEditorCondition[];
  expression: QueryEditorExpression;
}

export interface QueryEditorSectionProps {
  label: string;
  options: QueryEditorFieldDefinition[];
  onChange: (expression: QueryEditorSectionExpression) => void;
  value?: QueryEditorSectionExpression;
}

export interface QueryEditorSectionExpression {
  id: string;
  expression?: QueryEditorExpression;
}

export interface QueryEditorConditionalExpression extends QueryEditorExpression {}

export const QueryEditorSection = (config: QueryEditorDefaultProps): React.FC<QueryEditorSectionProps> => {
  return props => {
    const expression = props.value?.expression ?? config.expression;

    const onChange = useCallback(
      (expression: QueryEditorExpression | undefined) => {
        props.onChange({
          id: config.id,
          expression,
        });
      },
      [props.onChange]
    );

    return (
      <div className="gf-form">
        <InlineFormLabel className="query-keyword" width={12}>
          {props.label}
        </InlineFormLabel>
        <QueryEditorSectionRenderer
          expression={expression}
          options={props.options}
          onChange={onChange}
          operators={config.operators}
          conditionals={config.conditionals}
        />
      </div>
    );
  };
};
