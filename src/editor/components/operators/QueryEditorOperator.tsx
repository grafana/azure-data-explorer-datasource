import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Button, Select, useStyles2 } from '@grafana/ui';
import React from 'react';

import { isBoolOperator, isDateTimeOperator, isMultiOperator, isNumberOperator, isSingleOperator } from '../../guards';
import {
  QueryEditorOperator,
  QueryEditorOperatorDefinition,
  QueryEditorProperty,
  QueryEditorPropertyType,
} from '../../types';
import { ExpressionSuggestor } from '../types';
import { parseOperatorValue } from './parser';
import { QueryEditorBoolOperator } from './QueryEditorBoolOperator';
import { QueryEditorMultiOperator } from './QueryEditorMultiOperator';
import { QueryEditorNumberOperator } from './QueryEditorNumberOperator';
import { QueryEditorSingleOperator } from './QueryEditorSingleOperator';
import { QueryEditorStringOperator } from './QueryEditorStringOperator';

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

export const QueryEditorOperatorComponent: React.FC<Props> = (props: Props) => {
  const onChangeOperator = (selectable: SelectableValue<string>) => {
    if (selectable && selectable.value) {
      const { property, value } = props;
      const definition = props.operators.find((o) => o.value === selectable.value);

      if (!definition || !property) {
        return;
      }

      if (!value) {
        props.onChange(definitionToOperator(definition));
        return;
      }

      const operator = definitionToOperator(definition);
      const defaultValue = operator.value;
      const currentValue = value.value;
      operator.value = parseOperatorValue(property, definition, currentValue, defaultValue);

      props.onChange(operator);
    }
  };

  const onChangeValue = (operator: QueryEditorOperator) => {
    props.onChange(operator);
  };

  const { operators, value, getSuggestions, templateVariableOptions, property } = props;
  const styles = useStyles2(getStyles);
  const definition = operators.find((o) => o.value === value?.name);

  return (
    <>
      <div className={styles.container}>
        <Select
          isSearchable={true}
          options={operators}
          value={definition?.value}
          onChange={onChangeOperator}
          menuPlacement="bottom"
          renderControl={React.forwardRef(function F({ value, isOpen, invalid, ...otherProps }, ref) {
            return (
              <Button {...otherProps} ref={ref} variant="secondary">
                {definition?.label || definition?.value || '?'}
              </Button>
            );
          })}
        />
      </div>
      {renderOperatorInput(
        definition,
        value,
        onChangeValue,
        getSuggestions,
        templateVariableOptions,
        styles,
        property?.type
      )}
    </>
  );
};

const renderOperatorInput = (
  definition: QueryEditorOperatorDefinition | undefined,
  operator: QueryEditorOperator | undefined,
  onChangeValue: (expression: QueryEditorOperator) => void,
  getSuggestions: ExpressionSuggestor,
  templateVariableOptions: SelectableValue<string>,
  styles: { [constainer: string]: string },
  propertyType: QueryEditorPropertyType | undefined
) => {
  if (!definition) {
    return null;
  }

  if (isDateTimeOperator(operator, propertyType)) {
    return (
      <div className={styles.container}>
        <QueryEditorStringOperator operator={definition} value={operator?.value} onChange={onChangeValue} />
      </div>
    );
  }

  if (isNumberOperator(operator, propertyType)) {
    return (
      <div className={styles.container}>
        <QueryEditorNumberOperator operator={definition} value={operator?.value} onChange={onChangeValue} />
      </div>
    );
  }

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

const getStyles = (theme: GrafanaTheme2) => ({
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
});
