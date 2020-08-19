import React from 'react';
import { QueryEditorPropertyDefinition } from '../types';
import { QueryEditorFieldAndOperator } from './filter/QueryEditorFieldAndOperator';
import { QueryEditorRepeater } from './QueryEditorRepeater';
import { QueryEditorReduce } from './reduce/QueryEditorReduce';
import { QueryEditorGroupBy } from './groupBy/QueryEditorGroupBy';
import { SelectableValue } from '@grafana/data';
import { ExpressionSuggestor } from './types';
import { isReduceExpression, isFieldAndOperator, isGroupBy, isRepeater } from '../guards';
import { QueryEditorExpression } from '../expressions';

interface Props<TConfig> {
  config: TConfig;
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  expression: QueryEditorExpression | undefined;
  onChange: (expression: QueryEditorExpression) => void;
  getSuggestions: ExpressionSuggestor;
}

export function QueryEditorSectionRenderer<T>(props: Props<T>) {
  const { expression, config, onChange, fields, getSuggestions } = props;

  if (!expression) {
    return null;
  }

  if (isFieldAndOperator(expression)) {
    // TODO: fix any
    return (
      <QueryEditorFieldAndOperator
        value={expression}
        operators={(config as any).operators}
        fields={fields}
        templateVariableOptions={props.templateVariableOptions}
        onChange={onChange}
        getSuggestions={getSuggestions}
      />
    );
  }

  if (isReduceExpression(expression)) {
    // TODO: fix any
    return (
      <QueryEditorReduce
        value={expression}
        fields={fields}
        templateVariableOptions={props.templateVariableOptions}
        functions={(config as any).functions}
        onChange={onChange}
      />
    );
  }

  if (isGroupBy(expression)) {
    // TODO: fix any
    return (
      <QueryEditorGroupBy
        value={expression}
        fields={fields}
        templateVariableOptions={props.templateVariableOptions}
        intervals={(config as any).intervals}
        onChange={onChange}
      />
    );
  }

  if (isRepeater(expression)) {
    return (
      <QueryEditorRepeater onChange={onChange} value={expression} getSuggestions={getSuggestions}>
        {childProps => (
          <QueryEditorSectionRenderer
            {...props}
            fields={fields}
            templateVariableOptions={props.templateVariableOptions}
            onChange={childProps.onChange}
            expression={childProps.value}
          />
        )}
      </QueryEditorRepeater>
    );
  }

  return null;
}
