import React, { useState } from 'react';
import { QueryEditorExpression, QueryEditorExpressionType } from './types';

interface Props {
  children: (
    value: QueryEditorExpression | undefined,
    onChange: (expression: QueryEditorExpression | undefined) => void,
    key: string
  ) => React.ReactElement;
  value?: QueryEditorRepeaterExpression;
  onChange: (expression: QueryEditorRepeaterExpression) => void;
}

export interface QueryEditorRepeaterExpression extends QueryEditorExpression {
  expressions: QueryEditorExpression[];
}

export const QueryEditorRepeater: React.FC<Props> = props => {
  const [values, setValues] = useState<QueryEditorExpression[]>(props.value?.expressions ?? []);

  return (
    <div>
      {values.map((value, index) => {
        const onChange = (expression: QueryEditorExpression | undefined) => {
          if (!expression) {
            return;
          }

          values.splice(index, 1, expression);
          setValues([...values]);
        };
        return props.children(value, onChange, `rptr-${index}`);
      })}
    </div>
  );
};

export const isRepeater = (expression: QueryEditorExpression): expression is QueryEditorRepeaterExpression => {
  return (expression as QueryEditorRepeaterExpression)?.type === QueryEditorExpressionType.OperatorRepeater;
};
