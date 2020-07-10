import React, { useState } from 'react';
import { QueryEditorExpression, QueryEditorExpressionType } from './types';

interface Props {
  children: (
    value: QueryEditorExpression | undefined,
    onChange: (expression: QueryEditorExpression | undefined) => void
  ) => React.ReactElement;
  value?: QueryEditorOperatorRepeaterExpression;
  onChange: (expression: QueryEditorOperatorRepeaterExpression) => void;
}

export interface QueryEditorOperatorRepeaterExpression extends QueryEditorExpression {
  expressions: QueryEditorExpression[];
}

export const QueryEditorOperatorRepeater: React.FC<Props> = props => {
  const [values, setValues] = useState<Array<QueryEditorExpression | undefined>>(
    props.value?.expressions ?? [undefined]
  );

  return (
    <div>
      {values.map((value, index) => {
        const onChange = (expression: QueryEditorExpression | undefined) => {
          values.splice(index, 1, expression);
          const nextValues = values.filter(value => !!value);
          setValues([...nextValues, undefined]);
        };
        return props.children(value, onChange);
      })}
    </div>
  );
};

export const isRepeater = (expression: QueryEditorExpression): expression is QueryEditorOperatorRepeaterExpression => {
  return (expression as QueryEditorOperatorRepeaterExpression)?.type === QueryEditorExpressionType.Field;
};
