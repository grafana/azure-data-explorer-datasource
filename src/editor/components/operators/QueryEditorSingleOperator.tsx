import React, { PureComponent } from 'react';
import { SegmentAsync, IconButton } from '@grafana/ui';
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

  render() {
    const value = this.props.value || '';

    return (
      <SegmentAsync
        allowCustomValue
        Component={<SingleValueDisplay value={value} />}
        value={value}
        loadOptions={(query?: string) => this.props.getSuggestions(query ?? '', this.props.expression)}
        onChange={this.onChange}
      />
    );
  }
}

interface SingleValueDisplayProps {
  value: string;
  onRemove?: () => void;
}

export const SingleValueDisplay: React.FC<SingleValueDisplayProps> = props => {
  return (
    <div className="gf-form-label">
      {props.value ? props.value : 'Click to enter value...'} &nbsp;
      {props.onRemove && <IconButton name="times" size="sm" surface="header" onClick={props.onRemove} />}
    </div>
  );
};

export const isSingleOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorSingleOperatorExpression => {
  return typeof (expression as QueryEditorSingleOperatorExpression)?.value === 'string';
};
