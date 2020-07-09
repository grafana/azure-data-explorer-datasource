import React, { useState, useMemo, useCallback } from 'react';
import { css } from 'emotion';
import { QueryEditorExpression, QueryEditorExpressionType, QueryEditorOperatorExpression } from './types';
import { QueryEditorOperatorDefinition, QueryEditorFieldDefinition } from '../types';
import { QueryEditorField, QueryEditorFieldExpression, isField } from './QueryEditorField';
import { QueryEditorOperator, isOperator } from './QueryEditorOperator';
import { stylesFactory } from '@grafana/ui';

interface Props {
  id: string;
  options: QueryEditorFieldDefinition[];
  operators: QueryEditorOperatorDefinition[];
  onChange: (expression: QueryEditorFieldAndOperatorExpression) => void;
}

export interface QueryEditorFieldAndOperatorExpression extends QueryEditorExpression {
  field: QueryEditorFieldExpression;
  operator: QueryEditorOperatorExpression;
}

export const QueryEditorFieldAndOperator: React.FC<Props> = props => {
  const styles = getStyles();
  const [field, setField] = useState<QueryEditorFieldExpression>();
  const [operator, setOperator] = useState<QueryEditorOperatorExpression>();
  const operatorsByType = useOperatorByType(props.operators);
  const operators = getOperatorsForField(operatorsByType, field, props.options);

  const onChange = useCallback(
    (expression: QueryEditorFieldExpression | QueryEditorOperatorExpression) => {
      if (isField(expression)) {
        setField(expression);
      }

      if (isOperator(expression)) {
        setOperator(expression);
      }

      if (field && operator) {
        props.onChange({
          id: props.id,
          type: QueryEditorExpressionType.Operator,
          field: field,
          operator,
        });
      }
    },
    [setField, setOperator, props.onChange, props.id]
  );

  return (
    <div className={styles.container}>
      <QueryEditorField id={props.id} options={props.options} onChange={onChange} />
      <QueryEditorOperator id={props.id} operators={operators} onChange={onChange} />
    </div>
  );
};

const useOperatorByType = (
  operators: QueryEditorOperatorDefinition[]
): Record<string, QueryEditorOperatorDefinition[]> => {
  return useMemo(() => {
    const groups = {};

    for (const operator of operators) {
      for (const type of operator.supportTypes) {
        const key = type.toString();

        if (!Array.isArray(groups[key])) {
          groups[key] = [];
        }
        groups[key].push(operator);
      }
    }

    return groups;
  }, [operators]);
};

const getOperatorsForField = (
  groups: Record<string, QueryEditorOperatorDefinition[]>,
  expression: QueryEditorFieldExpression | undefined,
  fields: QueryEditorFieldDefinition[]
) => {
  if (!expression) {
    const fieldType = fields[0]?.fieldType.toString() ?? '';
    return groups[fieldType] ?? [];
  }
  return groups[expression?.field.fieldType.toString() ?? ''] ?? [];
};

const getStyles = stylesFactory(() => {
  return {
    container: css`
      display: flex;
      flex-direction: row;
    `,
  };
});
