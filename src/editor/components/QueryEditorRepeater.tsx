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

export const QueryEditorRepeater: React.FC<Props> = props => {
  const { onChange: propsOnChange, children, value, id } = props;
  /* eslint-disable react-hooks/exhaustive-deps */
  const onChange = useCallback(
    (index: number, expression?: QueryEditorExpression) => {
      const { expressions } = value;
      const next = Array.from(expressions);

      if (expression) {
        next.splice(index, 1, expression);
      } else {
        next.splice(index, 1);
      }

      propsOnChange({
        ...value,
        expressions: next,
      });
    },
    [children, propsOnChange, value]
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  if (!value?.expressions) {
    return null;
  }

  const length = value.expressions.length;

  return (
    <>
      {value.expressions.map((val, idx) => {
        return (
          <React.Fragment key={`${id}-${idx}`}>
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
