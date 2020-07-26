import React, { useCallback, useEffect, useState } from 'react';
import { css } from 'emotion';
import { InlineFormLabel, stylesFactory } from '@grafana/ui';
import { QueryEditorFieldDefinition, QueryEditorFunctionDefinition, QueryEditorFunctionParameter } from '../../types';
import { QueryEditorField, QueryEditorFieldExpression } from '../field/QueryEditorField';
import { QueryEditorExpression, QueryEditorExpressionType } from '../../../types';
import { SelectableValue } from '@grafana/data';
import {
  QueryEditorFunctionParameterSection,
  QueryEditorFunctionParameterExpression,
} from '../field/QueryEditorFunctionParameterSection';

interface Props {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  functions: QueryEditorFunctionDefinition[];
  value?: QueryEditorReduceExpression;
  label?: string;
  onChange: (expression: QueryEditorReduceExpression) => void;
}

export interface QueryEditorReduceExpression extends QueryEditorExpression {
  field: QueryEditorFieldExpression;
  reduce: QueryEditorFieldExpression;
  parameters?: QueryEditorFunctionParameterExpression[];
}

export const QueryEditorReduce: React.FC<Props> = props => {
  const [field, setField] = useState(props.value?.field);
  const [reduce, setReduce] = useState(props.value?.reduce);
  const [parameters, setParameters] = useState(props.value?.parameters);
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

  const onChangeParameter = useCallback(
    (expression: QueryEditorFunctionParameterExpression[]) => {
      setParameters(expression);
    },
    [setParameters]
  );

  useEffect(() => {
    if (field && reduce) {
      const payload = {
        type: QueryEditorExpressionType.Reduce,
        field,
        reduce,
        parameters: parameters,
      };

      props.onChange(payload);
    }
  }, [field, reduce, parameters]);

  const reduceParameters: QueryEditorFunctionParameter[] = getParameters(reduce, props.functions);

  return (
    <div className={styles.container}>
      <QueryEditorField
        value={field}
        fields={props.fields}
        templateVariableOptions={props.templateVariableOptions}
        onChange={onChangeField}
        placeholder="Choose column..."
      />
      <InlineFormLabel className="query-keyword">{props.label ?? 'aggregate by'}</InlineFormLabel>
      <QueryEditorField
        value={reduce}
        fields={props.functions}
        templateVariableOptions={props.templateVariableOptions}
        onChange={onChangeReduce}
        placeholder="Choose aggregation function..."
      />
      {reduceParameters &&
        reduceParameters.map(param => {
          return (
            <QueryEditorFunctionParameterSection
              key={param.name}
              name={param.name}
              value={props.value?.parameters?.find(p => p.name === param.name)?.value}
              description={param.description}
              fieldType={param.type}
              onChange={val => onChangeParameter([val])}
            />
          );
        })}
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

const getParameters = (
  reduce: QueryEditorFieldExpression | undefined,
  functions: QueryEditorFunctionDefinition[]
): QueryEditorFunctionParameter[] => {
  if (!reduce) {
    return [];
  }
  const func = functions.find(func => func.value === reduce.value);

  return func?.parameters || [];
};
