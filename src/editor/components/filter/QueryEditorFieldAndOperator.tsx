import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import debounce from 'debounce-promise';
import { css } from '@emotion/css';
import React, { useState } from 'react';
import { useEffectOnce } from 'react-use';

import { QueryEditorExpressionType, QueryEditorOperatorExpression } from '../../expressions';
import {
  QueryEditorOperator,
  QueryEditorOperatorDefinition,
  QueryEditorProperty,
  QueryEditorPropertyDefinition,
} from '../../types';
import { QueryEditorField } from '../field/QueryEditorField';
import { parseOperatorValue } from '../operators/parser';
import { definitionToOperator, QueryEditorOperatorComponent } from '../operators/QueryEditorOperator';
import { SkippableExpressionSuggestor } from '../types';
import { cloneDeep } from 'lodash';

interface Props {
  value?: QueryEditorOperatorExpression;
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  operators: QueryEditorOperatorDefinition[];
  onChange: (expression: QueryEditorOperatorExpression) => void;
  getSuggestions: SkippableExpressionSuggestor;
}

export const QueryEditorFieldAndOperator: React.FC<Props> = (props: Props) => {
  // operators we can use for the field
  const [operators, setOperators] = useState<QueryEditorOperatorDefinition[]>([]);
  // If the value is a string, template variable can be quoted when used as values
  const templateVariableOptionsValues = cloneDeep(props.templateVariableOptions);
  if (Array.isArray(props.templateVariableOptions.options) && props.value?.property.type === 'string') {
    templateVariableOptionsValues.options = props.templateVariableOptions.options.map((op: SelectableValue<string>) => {
      return { label: op.value, value: `'${op.value}'` };
    });
  }

  // Find the valid operators to the given field and save it in state
  const updateOperators = (field: QueryEditorProperty): QueryEditorOperatorDefinition[] => {
    const operators: QueryEditorOperatorDefinition[] = [];
    for (const op of props.operators) {
      if (op.supportTypes.includes(field.type)) {
        operators.push(op);
      }
    }
    setOperators(operators);
    return operators;
  };

  useEffectOnce(() => {
    const field = props.value?.property;
    if (field) {
      updateOperators(field);
    }
  });

  const onFieldChanged = (property: QueryEditorProperty) => {
    let next: QueryEditorOperatorExpression = {
      ...props.value!,
      property,
    };

    const operators = updateOperators(property);
    const currentOperator = next.operator?.name;
    const definition = operators.find((op) => op.value === currentOperator);

    if (operators.length && !definition) {
      next.operator = definitionToOperator(operators[0]);
      const defaultValue = next.operator.value;
      const currentValue = props.value?.operator.value;
      next.operator.value = parseOperatorValue(next.property, operators[0], currentValue, defaultValue);
    }

    if (!definition) {
      return props.onChange(next);
    }

    // Give it default values
    next.operator = definitionToOperator(definition);
    const defaultValue = next.operator.value;
    const currentValue = props.value?.operator.value;
    next.operator.value = parseOperatorValue(next.property, definition, currentValue, defaultValue);
    props.onChange(next);
  };

  const onOperatorChange = (operator: QueryEditorOperator) => {
    props.onChange({
      ...props.value!,
      operator,
    });
  };

  const getSuggestions = debounce(
    async (txt: string) => {
      if (!props.value) {
        return [];
      }

      const filter = createFilter(props.value.property, txt);
      const results = await props.getSuggestions(filter);

      if (Array.isArray(templateVariableOptionsValues)) {
        const variables = templateVariableOptionsValues.filter((v) => {
          if (typeof v?.value === 'string') {
            return v.value.includes(txt);
          }
          return false;
        });

        Array.prototype.push.apply(results, variables);
      }

      return results;
    },
    800,
    { leading: false }
  );

  const { value, fields } = props;

  const styles = useStyles2(getStyles);
  const showOperators = value?.operator || value?.property;

  return (
    <div className={styles.container}>
      <QueryEditorField
        value={value?.property}
        fields={fields}
        templateVariableOptions={props.templateVariableOptions}
        onChange={onFieldChanged}
        placeholder="Choose column..."
        aria-label="choose column for where filter"
      />
      {showOperators && (
        <QueryEditorOperatorComponent
          value={value?.operator}
          operators={operators}
          onChange={onOperatorChange}
          getSuggestions={getSuggestions}
          property={value?.property}
          templateVariableOptions={templateVariableOptionsValues}
        />
      )}
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    display: flex;
    flex-direction: row;
  `,
});

const createFilter = (property: QueryEditorProperty, value: string): QueryEditorOperatorExpression => {
  if (!value) {
    return {
      type: QueryEditorExpressionType.Operator,
      property: property,
      operator: {
        name: 'isnotempty',
        value,
      },
    };
  }

  return {
    type: QueryEditorExpressionType.Operator,
    property: property,
    operator: {
      name: 'contains',
      value,
    },
  };
};
