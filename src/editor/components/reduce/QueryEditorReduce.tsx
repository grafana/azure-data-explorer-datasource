import React, { useCallback, useEffect, useState } from 'react';
import { css } from 'emotion';
import { InlineFormLabel, stylesFactory } from '@grafana/ui';
import {
  QueryEditorFieldDefinition,
  QueryEditorFunctionDefinition,
  QueryEditorFunctionParameter,
  QueryEditorPropertyType,
  QueryEditorProperty,
} from '../../types';
import { QueryEditorField } from '../field/QueryEditorField';
import { SelectableValue } from '@grafana/data';
import { QueryEditorFunctionParameterSection } from '../field/QueryEditorFunctionParameterSection';
import {
  QueryEditorReduceExpression,
  QueryEditorFunctionParameterExpression,
  QueryEditorExpressionType,
} from '../../expressions';

interface Props {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  functions: QueryEditorFunctionDefinition[];
  value?: QueryEditorReduceExpression;
  label?: string;
  onChange: (expression: QueryEditorReduceExpression) => void;
}

export const QueryEditorReduce: React.FC<Props> = props => {
  const [field, setField] = useState(props.value?.property);
  const [reduce, setReduce] = useState(props.value?.reduce);
  const [parameters, setParameters] = useState(props.value?.parameters);
  const styles = getStyles();

  const onChangeField = useCallback(
    (property: QueryEditorProperty) => {
      setField(property);

      // Set a reasonable value
      if (!props.value?.reduce?.name) {
        let reducer = props.functions.find(f => f.value === 'avg');
        if (!reducer) {
          reducer = props.functions[0];
        }
        setReduce({
          name: reducer.value,
          type: QueryEditorPropertyType.Function,
        });
      }
    },
    [setField]
  );

  const onChangeReduce = useCallback(
    (property: QueryEditorProperty) => {
      setReduce(property);
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
      const payload: QueryEditorReduceExpression = {
        type: QueryEditorExpressionType.Reduce,
        property: field,
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

const getStyles = stylesFactory(() => {
  return {
    container: css`
      display: flex;
      flex-direction: row;
    `,
  };
});

const getParameters = (
  reduce: QueryEditorProperty | undefined,
  functions: QueryEditorFunctionDefinition[]
): QueryEditorFunctionParameter[] => {
  if (!reduce) {
    return [];
  }
  const func = functions.find(func => func.value === reduce.name);

  return func?.parameters || [];
};
