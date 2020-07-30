import React, { PureComponent } from 'react';
import { AsyncSelect } from '@grafana/ui';
import { QueryEditorOperatorExpression, ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition } from '../../types';
import { QueryEditorExpressionType, QueryEditorExpression } from '../../../types';
import { SelectableValue } from '@grafana/data';

interface Props {
  value: string | undefined;
  onChange: (expression: QueryEditorSingleOperatorExpression) => void;
  operator: QueryEditorOperatorDefinition;
  getSuggestions: ExpressionSuggestor;
  expression: QueryEditorExpression;
}

export interface QueryEditorSingleOperatorExpression extends QueryEditorOperatorExpression {
  value: string;
}

export class QueryEditorSingleOperator extends PureComponent<Props> {
  onChange = (evt: SelectableValue<any>) => {
    this.props.onChange({
      type: QueryEditorExpressionType.Operator,
      value: `${evt.value}`, // Currently strings only
      operator: this.props.operator,
    });
  };

  onCreate = (value: string) => {
    if (!value) {
      return;
    }
    this.props.onChange({
      type: QueryEditorExpressionType.Operator,
      value,
      operator: this.props.operator,
    });
  };

  getSuggestions = (txt: string) => {
    console.log('Getting suggestions', txt);
    return this.props.getSuggestions(txt, this.props.expression);
  };

  render() {
    const { value } = this.props;
    const current = value
      ? {
          label: value,
          value,
        }
      : undefined;

    return (
      <AsyncSelect
        width={30}
        placeholder="Enter value..."
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

export const isSingleOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorSingleOperatorExpression => {
  return typeof (expression as QueryEditorSingleOperatorExpression)?.value === 'string';
};
