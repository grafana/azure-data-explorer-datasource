import React, { useCallback } from 'react';
import { InlineFormLabel } from '@grafana/ui';
import { QueryEditorExpression } from './types';
interface QueryEditorSectionProps {
  id: string;
  label: string;
  onChange: (expression: QueryEditorSectionExpression) => void;
  children: (childProps: ChildProps) => React.ReactElement;
}
interface ChildProps {
  onChange: (expression: QueryEditorExpression | undefined) => void;
}

export interface QueryEditorSectionBaseProps extends Omit<QueryEditorSectionProps, 'id' | 'children'> {}
export interface QueryEditorSectionExpression {
  id: string;
  expression?: QueryEditorExpression;
}

export const QueryEditorSection: React.FC<QueryEditorSectionProps> = props => {
  const onChange = useCallback(
    (expression: QueryEditorExpression | undefined) => {
      props.onChange({
        id: props.id,
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
      {props.children({ onChange })}
    </div>
  );
};
