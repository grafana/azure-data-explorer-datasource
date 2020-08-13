import React, { PureComponent } from 'react';
import { AsyncSelect } from '@grafana/ui';
import { ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition } from '../../types';
import { SelectableValue } from '@grafana/data';
import {
  QueryEditorSingleOperatorExpression,
  QueryEditorExpression,
  QueryEditorExpressionType,
} from '../../expressions';

interface Props {
  value: string | undefined;
  onChange: (expression: QueryEditorSingleOperatorExpression) => void;
  operator: QueryEditorOperatorDefinition;
  getSuggestions: ExpressionSuggestor;
  expression: QueryEditorExpression;
  templateVariableOptions: SelectableValue<string>;
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
    const { value, templateVariableOptions } = this.props;
    const current = value
      ? {
          label: value,
          value,
        }
      : undefined;

    return (
      <AsyncSelect
        width={30}
        placeholder="Start typing to add filters..."
        loadOptions={this.getSuggestions}
        defaultOptions={[templateVariableOptions]}
        value={current}
        onChange={this.onChange}
        onCreateOption={this.onCreate}
        allowCustomValue={true}
        noOptionsMessage='No options found'
      />
    );
  }
}
