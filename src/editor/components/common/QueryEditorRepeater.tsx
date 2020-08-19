import React, { useCallback } from 'react';
import { QueryEditorExpression, QueryEditorArrayExpression } from '../../expressions';

interface Props {
  id: string;
  value: QueryEditorArrayExpression;
  onChange: (value: QueryEditorArrayExpression) => void;
  children: (props: ChildProps) => React.ReactElement | null;
}

interface ChildProps {
  index: number;
  onChange: (value: QueryEditorExpression) => void;
  onRemove: () => void;
  onAdd: (value: QueryEditorExpression) => void;
  value?: QueryEditorExpression;
}

export const QueryEditorRepeater: React.FC<Props> = props => {
  const onChange = useCallback(
    (index: number, expression?: QueryEditorExpression) => {
      const { expressions } = props.value;
      const next = Array.from(expressions);

      if (expression) {
        next.splice(index, 1, expression);
      } else {
        next.splice(index, 1);
      }

      props.onChange({
        ...props.value,
        expressions: next,
      });
    },
    [props.children, props.onChange, props.value]
  );

  if (!props.value?.expressions) {
    return null;
  }

  return (
    <>
      {props.value.expressions.map((value, index) => {
        return (
          <React.Fragment key={`${props.id}-${index}`}>
            {props.children({
              index,
              value,
              onChange: (expression: QueryEditorExpression) => onChange(index, expression),
              onAdd: (expression: QueryEditorExpression) => onChange(props.value.expressions.length, expression),
              onRemove: () => onChange(index),
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};
