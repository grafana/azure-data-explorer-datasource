import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { css } from 'emotion';
import { stylesFactory } from '@grafana/ui';
import { QueryEditorOperatorExpression } from '../types';
import { QueryEditorFieldDefinition, QueryEditorOperatorDefinition } from '../../types';
import { QueryEditorField, QueryEditorFieldExpression } from '../field/QueryEditorField';
import { QueryEditorOperator } from '../operators/QueryEditorOperator';
import { QueryEditorExpression, QueryEditorExpressionType } from '../../../types';
import { SelectableValue } from '@grafana/data';

interface Props {
  value?: QueryEditorFieldAndOperatorExpression;
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  operators: QueryEditorOperatorDefinition[];
  onChange: (expression: QueryEditorFieldAndOperatorExpression | undefined) => void;
}

export interface QueryEditorFieldAndOperatorExpression extends QueryEditorExpression {
  field: QueryEditorFieldExpression;
  operator: QueryEditorOperatorExpression;
}

export const QueryEditorFieldAndOperator: React.FC<Props> = props => {
  const [field, setField] = useState(props.value?.field);
  const [operator, setOperator] = useState(props.value?.operator);
  const operatorsByType = useOperatorByType(props.operators);

  const onFieldChange = useCallback(
    (expression: QueryEditorFieldExpression) => {
      setField(expression);
    },
    [setField, props.value]
  );

  const onOperatorChange = useCallback(
    (op: QueryEditorOperatorExpression) => {
      setOperator(op);
    },
    [setField, props.value]
  );

  useEffect(() => {
    if (operator && field) {
      const payload = {
        type: QueryEditorExpressionType.FieldAndOperator,
        field,
        operator,
      };

      props.onChange(payload);
    } else {
      console.log('NO operator and field????', props);
    }
  }, [field, operator]);

  const operators = operatorsByType[field?.fieldType.toString() ?? ''] ?? [];
  const styles = getStyles();

  return (
    <div className={styles.container}>
      <QueryEditorField
        value={field}
        fields={props.fields}
        templateVariableOptions={props.templateVariableOptions}
        onChange={onFieldChange}
        placeholder="Choose column..."
      />
      <QueryEditorOperator value={operator} operators={operators} onChange={onOperatorChange} />
    </div>
  );
};

export const isFieldAndOperator = (
  expression: QueryEditorExpression
): expression is QueryEditorFieldAndOperatorExpression => {
  return (expression as QueryEditorFieldAndOperatorExpression)?.type === QueryEditorExpressionType.FieldAndOperator;
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

const getStyles = stylesFactory(() => {
  return {
    container: css`
      display: flex;
      flex-direction: row;
    `,
  };
});
