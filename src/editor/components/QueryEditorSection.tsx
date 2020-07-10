import React, { useCallback } from 'react';
import { InlineFormLabel } from '@grafana/ui';
import { QueryEditorExpression } from './types';
import { QueryEditorField, isField } from './QueryEditorField';
import { QueryEditorOperatorDefinition, QueryEditorCondition, QueryEditorFieldDefinition } from '../types';
import { QueryEditorFieldAndOperator, isFieldAndOperator } from './QueryEditorFieldAndOperator';
import { QueryEditorOperatorRepeater, isRepeater } from './QueryEditorOperatorRepeater';

interface QueryEditorDefaultProps {
  id: string;
  operators: QueryEditorOperatorDefinition[];
  conditionals: QueryEditorCondition[];
  expression: QueryEditorExpression;
}

export interface QueryEditorSectionProps {
  label: string;
  options: QueryEditorFieldDefinition[];
  onChange: (expression: QueryEditorSectionExpression) => void;
  value?: QueryEditorSectionExpression;
}

export interface QueryEditorSectionExpression {
  id: string;
  expression?: QueryEditorExpression;
}

export interface QueryEditorConditionalExpression extends QueryEditorExpression {}

export const QueryEditorSection = (internalProps: QueryEditorDefaultProps): React.FC<QueryEditorSectionProps> => {
  return props => {
    const onChange = useCallback(
      (expression: QueryEditorExpression | undefined) => {
        props.onChange({
          id: internalProps.id,
          expression,
        });
      },
      [props.onChange]
    );

    console.log('internalProps', internalProps);

    return (
      <div className="gf-form">
        <InlineFormLabel className="query-keyword" width={12}>
          {props.label}
        </InlineFormLabel>
        <QueryEditorRenderer
          value={props.value?.expression}
          options={props.options}
          onChange={onChange}
          defaults={internalProps}
        />
      </div>
    );
  };
};

interface Props {
  options: QueryEditorFieldDefinition[];
  defaults: QueryEditorDefaultProps;
  value?: QueryEditorExpression;
  onChange: (expression: QueryEditorExpression | undefined) => void;
}

const QueryEditorRenderer: React.FC<Props> = props => {
  const { value, defaults, onChange, options } = props;
  const expression = value ?? defaults.expression;

  if (isField(expression)) {
    return <QueryEditorField fields={options} onChange={onChange} />;
  }

  if (isFieldAndOperator(expression)) {
    return <QueryEditorFieldAndOperator operators={defaults.operators} fields={options} onChange={onChange} />;
  }

  if (isRepeater(expression)) {
    return (
      <QueryEditorOperatorRepeater onChange={onChange} value={expression}>
        {(value, onChange) => (
          <QueryEditorRenderer options={options} onChange={onChange} value={value} defaults={defaults} />
        )}
      </QueryEditorOperatorRepeater>
    );
  }

  return null;
};

/**
 * 
<QueryEditor isLoading={} onQueryChanged={} onJoinQueryParts={}>
    <KustoWhereEditor values={}>
    <KustoValueColumnEditor values={}>
    <KustoGroupByColumnEditor values={}>
</QueryEditor>

 */
