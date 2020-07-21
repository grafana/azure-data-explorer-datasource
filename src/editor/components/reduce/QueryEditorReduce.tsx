import React, { useCallback, useEffect, useState } from 'react';
import { css } from 'emotion';
import { InlineFormLabel, stylesFactory } from '@grafana/ui';
import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorField, QueryEditorFieldExpression } from '../field/QueryEditorField';
import { QueryEditorExpression, QueryEditorExpressionType } from '../../../types';

interface Props {
  fields: QueryEditorFieldDefinition[];
  functions: QueryEditorFieldDefinition[];
  value?: QueryEditorReduceExpression;
  label?: string;
  onChange: (expression: QueryEditorReduceExpression) => void;
}

export interface QueryEditorReduceExpression extends QueryEditorExpression {
  field: QueryEditorFieldExpression;
  reduce: QueryEditorFieldExpression;
}

export const QueryEditorReduce: React.FC<Props> = props => {
  const [field, setField] = useState(props.value?.field);
  const [reduce, setReduce] = useState(props.value?.reduce);
  const styles = getStyles();

  const onChangeField = useCallback(
    (expression: QueryEditorFieldExpression) => {
      setField(expression);
    },
    [setField]
  );

  const onChangeReduce = useCallback(
    (expression: QueryEditorFieldExpression) => {
      setReduce(expression);
    },
    [setReduce]
  );

  useEffect(() => {
    if (field && reduce) {
      const payload = {
        type: QueryEditorExpressionType.Reduce,
        field,
        reduce,
      };

      props.onChange(payload);
    }
  }, [field, reduce]);

  return (
    <div className={styles.container}>
      <QueryEditorField value={field} fields={props.fields} onChange={onChangeField} placeholder="Choose column..." />
      <InlineFormLabel className="query-keyword">{props.label ?? 'aggregate by'}</InlineFormLabel>
      <QueryEditorField
        value={reduce}
        fields={props.functions}
        onChange={onChangeReduce}
        placeholder="Choose aggregation function..."
      />
    </div>
  );
};

export const isReduce = (expression: QueryEditorExpression): expression is QueryEditorReduceExpression => {
  return (expression as QueryEditorReduceExpression)?.type === QueryEditorExpressionType.Reduce;
};

const getStyles = stylesFactory(() => {
  return {
    container: css`
      display: flex;
      flex-direction: row;
    `,
  };
});
