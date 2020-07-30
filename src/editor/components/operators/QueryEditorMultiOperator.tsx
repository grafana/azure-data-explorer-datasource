import React, { PureComponent } from 'react';
import { AsyncMultiSelect } from '@grafana/ui';
import { QueryEditorOperatorExpression, ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition } from '../../types';
import { QueryEditorExpression, QueryEditorExpressionType } from '../../../types';

interface Props {
  values: string[] | undefined;
  onChange: (expression: QueryEditorMultiOperatorExpression) => void;
  operator: QueryEditorOperatorDefinition;
  getSuggestions: ExpressionSuggestor;
  expression: QueryEditorExpression;
}

export interface QueryEditorMultiOperatorExpression extends QueryEditorOperatorExpression {
  values: string[];
}

export class QueryEditorMultiOperator extends PureComponent<Props> {
  onCreate = (value: string) => {
    if (!value) {
      return;
    }
    // Append the new value
    const values = [...this.props.values, value];
    this.props.onChange({
      type: QueryEditorExpressionType.Operator,
      values,
      operator: this.props.operator,
    });
  };

  onChange = (selectable: any) => {
    if (!Array.isArray(selectable)) {
      return;
    }

    this.props.onChange({
      type: QueryEditorExpressionType.Operator,
      values: selectable.map(s => s.value),
      operator: this.props.operator,
    });
  };

  getSuggestions = (txt: string) => {
    console.log('Getting suggestions', txt);
    return this.props.getSuggestions(txt, this.props.expression);
  };

  render() {
    const values = this.props.values || [];
    const current = values.map(v => {
      return { label: v, value: v };
    });

    return (
      <AsyncMultiSelect
        width={30}
        placeholder="Enter values..."
        loadOptions={this.getSuggestions}
        value={current}
        onChange={this.onChange}
        onCreateOption={this.onCreate}
        allowCustomValue={true}
        noOptionsMessage={'Start typing to add filters...'}
      />
    );
  }
}

export const isMultiOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorMultiOperatorExpression => {
  return Array.isArray((expression as QueryEditorMultiOperatorExpression)?.values);
};
