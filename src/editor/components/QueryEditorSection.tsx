import React from 'react';
import { InlineFormLabel } from '@grafana/ui';
import { QueryEditorExpression } from './types';
import { QueryEditorField } from './QueryEditorField';
import { QueryEditorOperatorDefinition, QueryEditorCondition, QueryEditorFieldDefinition } from '../types';
import { QueryEditorFieldAndOperator } from './QueryEditorFieldAndOperator';

interface QueryEditorInternalProps {
  id: string;
  operators: QueryEditorOperatorDefinition[];
  conditionals: QueryEditorCondition[];
  multipleRows: boolean;
}

export interface QueryEditorPartProps {
  label: string;
  options: QueryEditorFieldDefinition[];
  onChange: (expression: QueryEditorExpression) => void;
}

export interface QueryEditorConditionalExpression extends QueryEditorExpression {}

export const QueryEditorSection = (internalProps: QueryEditorInternalProps): React.FC<QueryEditorPartProps> => {
  return props => {
    return (
      <div className="gf-form">
        <InlineFormLabel className="query-keyword" width={12}>
          {props.label}
        </InlineFormLabel>
        {renderEditor(internalProps, props)}
      </div>
    );
  };
};

const renderEditor = (intrenalProps: QueryEditorInternalProps, props: QueryEditorPartProps) => {
  if (intrenalProps.conditionals.length === 0 && intrenalProps.operators.length === 0) {
    return <QueryEditorField id={intrenalProps.id} options={props.options} onChange={props.onChange} />;
  }

  if (intrenalProps.conditionals.length === 0 && intrenalProps.operators.length > 0) {
    return (
      <QueryEditorFieldAndOperator
        id={intrenalProps.id}
        operators={intrenalProps.operators}
        options={props.options}
        onChange={props.onChange}
      />
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
