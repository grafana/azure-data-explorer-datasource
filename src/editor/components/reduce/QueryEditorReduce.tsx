import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { css } from 'emotion';
import { InlineFormLabel, stylesFactory } from '@grafana/ui';
import {
  QueryEditorPropertyDefinition,
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
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  functions: QueryEditorFunctionDefinition[];
  value?: QueryEditorReduceExpression;
  label?: string;
  onChange: (expression: QueryEditorReduceExpression) => void;
}

export const QueryEditorReduce = (props: Props) => {
  const { value, functions, onChange } = props;
  const [field, setField] = useState(props.value?.property);
  const [reduce, setReduce] = useState(props.value?.reduce);
  const [parameters, setParameters] = useState(props.value?.parameters);
  const applyOnField = useApplyOnField(reduce, props.functions);
  const styles = getStyles();

  const onChangeField = useCallback(
    (property: QueryEditorProperty) => {
      setField(property);

      // Set a reasonable value
      if (!value?.reduce?.name) {
        let reducer = functions.find((f) => f.value === 'avg');
        if (!reducer) {
          reducer = functions[0];
        }
        setReduce({
          name: reducer.value,
          type: QueryEditorPropertyType.Function,
        });
      }
    },
    [setField, value, functions]
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

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (field && reduce) {
      const payload: QueryEditorReduceExpression = {
        type: QueryEditorExpressionType.Reduce,
        property: field,
        reduce,
        parameters: parameters,
      };

      onChange(payload); // adding onChange to dependency array below causes maximum call depth error
    }
  }, [field, reduce, parameters]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const reduceParameters: QueryEditorFunctionParameter[] = getParameters(reduce, props.functions);

  return (
    <div className={styles.container}>
      <QueryEditorField
        value={reduce}
        fields={props.functions}
        onChange={onChangeReduce}
        placeholder="Choose aggregation function..."
      />
      {reduceParameters.length > 0 && (
        <div className={styles.params}>
          {reduceParameters.map((param) => {
            return (
              <QueryEditorFunctionParameterSection
                key={param.name}
                name={param.name}
                value={props.value?.parameters?.find((p) => p.name === param.name)?.value}
                description={param.description}
                fieldType={param.type}
                onChange={(val) => onChangeParameter([val])}
              />
            );
          })}
        </div>
      )}
      {applyOnField && (
        <>
          <InlineFormLabel width={2} className="query-keyword">
            {props.label ?? 'of'}
          </InlineFormLabel>
          <QueryEditorField
            value={field}
            fields={props.fields}
            templateVariableOptions={props.templateVariableOptions}
            onChange={onChangeField}
            placeholder="Choose column..."
          />
        </>
      )}
    </div>
  );
};

const getStyles = stylesFactory(() => {
  return {
    container: css`
      display: flex;
      flex-direction: row;
    `,
    params: css`
      margin-right: 4px;
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
  const func = functions.find((func) => func.value === reduce.name);

  return func?.parameters || [];
};

const useApplyOnField = (
  property: QueryEditorProperty | undefined,
  functions: QueryEditorFunctionDefinition[]
): boolean => {
  return useMemo(() => {
    if (!property) {
      return functions[0]?.applyOnField ?? true;
    }
    const func = functions.find((f) => f.value === property.name);
    return func?.applyOnField ?? true;
  }, [functions, property]);
};
