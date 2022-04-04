import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import debounce from 'debounce-promise';
import { css } from 'emotion';
import React, { PureComponent } from 'react';

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

interface Props {
  value?: QueryEditorOperatorExpression;
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  operators: QueryEditorOperatorDefinition[];
  onChange: (expression: QueryEditorOperatorExpression) => void;
  getSuggestions: SkippableExpressionSuggestor;
}

interface State {
  // operators we can use for the field
  operators: QueryEditorOperatorDefinition[];
}

export class QueryEditorFieldAndOperator extends PureComponent<Props, State> {
  state: State = { operators: [] };

  componentDidMount = () => {
    const field = this.props.value?.property;
    if (field) {
      this.updateOperators(field);
    }
  };

  // Find the valid operators to the given field and save it in state
  updateOperators = (field: QueryEditorProperty): QueryEditorOperatorDefinition[] => {
    const operators: QueryEditorOperatorDefinition[] = [];
    for (const op of this.props.operators) {
      if (op.supportTypes.includes(field.type)) {
        operators.push(op);
      }
    }
    this.setState({ operators });
    return operators;
  };

  onFieldChanged = (property: QueryEditorProperty) => {
    let next: QueryEditorOperatorExpression = {
      ...this.props.value!,
      property,
    };

    const operators = this.updateOperators(property);
    const currentOperator = next.operator?.name;
    const definition = operators.find((op) => op.value === currentOperator);

    if (operators.length && !definition) {
      next.operator = definitionToOperator(operators[0]);
      const defaultValue = next.operator.value;
      const currentValue = this.props.value?.operator.value;
      next.operator.value = parseOperatorValue(next.property, operators[0], currentValue, defaultValue);
    }

    if (!definition) {
      return this.props.onChange(next);
    }

    // Give it default values
    next.operator = definitionToOperator(definition);
    const defaultValue = next.operator.value;
    const currentValue = this.props.value?.operator.value;
    next.operator.value = parseOperatorValue(next.property, definition, currentValue, defaultValue);
    this.props.onChange(next);
  };

  onOperatorChange = (operator: QueryEditorOperator) => {
    this.props.onChange({
      ...this.props.value!,
      operator,
    });
  };

  getSuggestions = debounce(
    async (txt: string) => {
      if (!this.props.value) {
        return [];
      }

      const filter = createFilter(this.props.value.property, txt);
      const results = await this.props.getSuggestions(filter);

      if (Array.isArray(this.props.templateVariableOptions?.options)) {
        const variables = this.props.templateVariableOptions.options.filter((v) => {
          if (typeof v?.value === 'string') {
            return v.value.indexOf(txt) > -1;
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

  render() {
    const { value, fields, templateVariableOptions } = this.props;
    const { operators } = this.state;

    const styles = useStyles2(getStyles);
    const showOperators = value?.operator || value?.property;

    return (
      <div className={styles.container}>
        <QueryEditorField
          value={value?.property}
          fields={fields}
          templateVariableOptions={templateVariableOptions}
          onChange={this.onFieldChanged}
          placeholder="Choose column..."
        />
        {showOperators && (
          <QueryEditorOperatorComponent
            value={value?.operator}
            operators={operators}
            onChange={this.onOperatorChange}
            getSuggestions={this.getSuggestions}
            property={value?.property}
            templateVariableOptions={templateVariableOptions}
          />
        )}
      </div>
    );
  }
}

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
