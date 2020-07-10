import React, { useCallback, useState } from 'react';
import { css } from 'emotion';
import { InlineFormLabel, stylesFactory } from '@grafana/ui';
import { QueryEditorExpression, QueryEditorExpressionType } from '../types';
import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorField, QueryEditorFieldExpression } from '../field/QueryEditorField';

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
    (expression: QueryEditorFieldExpression | undefined) => {
      if (!expression) {
        return;
      }

      setField(expression);

      if (!reduce) {
        return;
      }

      props.onChange({
        type: QueryEditorExpressionType.Reduce,
        field: expression,
        reduce: reduce,
      });
    },
    [setField, reduce, props.onChange]
  );

  const onChangeReduce = useCallback(
    (expression: QueryEditorFieldExpression | undefined) => {
      if (!expression) {
        return;
      }

      setReduce(expression);

      if (!field) {
        return;
      }

      props.onChange({
        type: QueryEditorExpressionType.Reduce,
        field: field,
        reduce: expression,
      });
    },
    [setReduce, field, props.onChange]
  );

  return (
    <div className={styles.container}>
      <QueryEditorField value={field} fields={props.fields} onChange={onChangeField} />
      <InlineFormLabel className="query-keyword">{props.label ?? 'aggregate by'}</InlineFormLabel>
      <QueryEditorField value={reduce} fields={props.functions} onChange={onChangeReduce} />
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
