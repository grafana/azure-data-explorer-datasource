import React, { useCallback } from 'react';
import { QueryEditorExpression, QueryEditorArrayExpression } from '../expressions';

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

export const QueryEditorRepeater = (props: Props) => {
  const { onChange: propsOnChange, children, value } = props;

  const onChange = useCallback(
    (index: number, expression?: QueryEditorExpression) => {
      const { expressions } = value;
      const next = [...expressions];

      if (expression) {
        next.splice(index, 1, expression);
      } else {
        next.splice(index, 1);
      }

      // Remove any expressions with empty sub expressions
      const remainingExpressions = next.filter((v) => {
        return 'expressions' in v ? v.expressions.length > 0 : true;
      });

      propsOnChange({
        ...value,
        expressions: remainingExpressions,
      });
    },
    [propsOnChange, value]
  );

  if (!value?.expressions) {
    return null;
  }

  const length = value.expressions.length;

  return (
    <>
      {Array.from(value.expressions).map((val, idx) => {
        return (
          <React.Fragment key={idx}>
            {children({
              index: idx,
              value: val,
              onChange: (expression: QueryEditorExpression) => onChange(idx, expression),
              onAdd: (expression: QueryEditorExpression) => onChange(length, expression),
              onRemove: () => onChange(idx),
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};
