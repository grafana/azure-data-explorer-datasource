import React, { PureComponent } from 'react';
import { Input } from '@grafana/ui';
import { QueryEditorOperatorExpression, ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition } from '../../types';
import { QueryEditorExpressionType, QueryEditorExpression } from '../../../types';

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

interface State {
  value: string;
}

export class QueryEditorSingleOperator extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      value: props.value || '',
    };
  }

  onChange = (event: React.FormEvent<HTMLInputElement>) => {
    if (!event || !event.currentTarget) {
      return;
    }
    const value = event.currentTarget.value;
    this.setState({ value });
  };

  onBlur = () => {
    this.props.onChange({
      type: QueryEditorExpressionType.Operator,
      value: this.state.value,
      operator: this.props.operator,
    });
  };

  onFocus = async () => {
    const sugs = await this.props.getSuggestions('', this.props.expression);
    console.log('TODO, show suggestions', sugs);
  };

  render() {
    return (
      <Input
        width={30}
        value={this.state.value}
        onChange={this.onChange}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        placeholder="Enter value..."
      />
    );
  }
}

export const isSingleOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorSingleOperatorExpression => {
  return typeof (expression as QueryEditorSingleOperatorExpression)?.value === 'string';
};
