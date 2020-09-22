import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { Select, stylesFactory, Button } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition, QueryEditorOperator, QueryEditorProperty } from '../../types';
import { QueryEditorMultiOperator } from './QueryEditorMultiOperator';
import { QueryEditorSingleOperator } from './QueryEditorSingleOperator';
import { QueryEditorBoolOperator } from './QueryEditorBoolOperator';
import { isMultiOperator, isBoolOperator, isSingleOperator } from '../../guards';
import { parseOperatorValue } from './parser';

interface Props {
  value?: QueryEditorOperator;
  property?: QueryEditorProperty;
  operators: QueryEditorOperatorDefinition[];
  onChange: (operator: QueryEditorOperator) => void;
  getSuggestions: ExpressionSuggestor;
  templateVariableOptions: SelectableValue<string>;
}

export const definitionToOperator = (definition: QueryEditorOperatorDefinition): QueryEditorOperator => {
  if (definition.booleanValues) {
    const defaultValue: QueryEditorOperator<boolean> = {
      name: definition.value,
      value: false,
    };

    return defaultValue;
  }

  if (definition.multipleValues) {
    const defaultValue: QueryEditorOperator<any[]> = {
      name: definition.value,
      value: [],
    };

    return defaultValue;
  }

  const defaultValue: QueryEditorOperator = {
    name: definition.value,
    value: '',
  };

  return defaultValue;
};

export class QueryEditorOperatorComponent extends PureComponent<Props> {
  onChangeOperator = (selectable: SelectableValue<string>) => {
    if (selectable && selectable.value) {
      const { property, value } = this.props;
      const definition = this.props.operators.find(o => o.value === selectable.value);

      if (!definition || !property) {
        return;
      }

      if (!value) {
        this.props.onChange(definitionToOperator(definition));
        return;
      }

      const operator = definitionToOperator(definition);
      const defaultValue = operator.value;
      const currentValue = value.value;
      operator.value = parseOperatorValue(property, definition, currentValue, defaultValue);

      this.props.onChange(operator);
    }
  };

  onChangeValue = (operator: QueryEditorOperator) => {
    this.props.onChange(operator);
  };

  render() {
    const { operators, value, getSuggestions, templateVariableOptions } = this.props;
    const styles = getStyles();
    const definition = operators.find(o => o.value === value?.name);

    return (
      <>
        <div className={styles.container}>
          <Select
            isSearchable={true}
            options={operators}
            value={definition?.value}
            onChange={this.onChangeOperator}
            menuPlacement="bottom"
            renderControl={React.forwardRef(({ value, isOpen, invalid, ...otherProps }, ref) => {
              return (
                <Button ref={ref} {...otherProps} variant="secondary">
                  {definition?.label || definition?.value || '?'}
                </Button>
              );
            })}
          />
        </div>
        {renderOperatorInput(definition, value, this.onChangeValue, getSuggestions, templateVariableOptions)}
      </>
    );
  }
}

const renderOperatorInput = (
  definition: QueryEditorOperatorDefinition | undefined,
  operator: QueryEditorOperator | undefined,
  onChangeValue: (expression: QueryEditorOperator) => void,
  getSuggestions: ExpressionSuggestor,
  templateVariableOptions: SelectableValue<string>
) => {
  if (!definition) {
    return null;
  }

  const styles = getStyles();

  if (definition.multipleValues && (isMultiOperator(operator) || !operator)) {
    return (
      <div className={styles.container}>
        <QueryEditorMultiOperator
          operator={definition}
          values={operator?.value ?? []}
          onChange={onChangeValue}
          getSuggestions={getSuggestions}
          templateVariableOptions={templateVariableOptions}
        />
      </div>
    );
  }

  if (definition.booleanValues && (isBoolOperator(operator) || !operator)) {
    return (
      <div className={styles.container}>
        <QueryEditorBoolOperator operator={definition} value={operator?.value} onChange={onChangeValue} />
      </div>
    );
  }

  if (!definition.multipleValues && (isSingleOperator(operator) || !operator)) {
    return (
      <div className={styles.container}>
        <QueryEditorSingleOperator
          operator={definition}
          value={operator?.value}
          onChange={onChangeValue}
          getSuggestions={getSuggestions}
          templateVariableOptions={templateVariableOptions}
        />
      </div>
    );
  }

  return null;
};

const getStyles = stylesFactory(() => {
  return {
    container: css`
      margin-right: 4px;
      /* when Grafanas Select has labels */
      div[class*='grafana-select-option-description'] {
        white-space: nowrap;
      }
      /* fallback until Grafanas Select has labels */
      [aria-label*='Select options menu'] {
        div {
          div {
            div {
              div {
                div {
                  white-space: nowrap;
                }
              }
            }
          }
        }
      }
    `,
  };
});
