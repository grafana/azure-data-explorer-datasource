import React, { useCallback } from 'react';
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

export interface QueryEditorSectionProps {
  label: string;
  options: QueryEditorFieldDefinition[];
  onChange: (expression: QueryEditorSectionExpression) => void;
}

export interface QueryEditorSectionExpression {
  id: string;
  expression?: QueryEditorExpression;
}

export interface QueryEditorConditionalExpression extends QueryEditorExpression {}

export const QueryEditorSection = (internalProps: QueryEditorInternalProps): React.FC<QueryEditorSectionProps> => {
  return props => {
    const onChange = useCallback(
      (expression: QueryEditorExpression) => {
        props.onChange({
          id: internalProps.id,
          expression,
        });
      },
      [props.onChange]
    );

    return (
      <div className="gf-form">
        <InlineFormLabel className="query-keyword" width={12}>
          {props.label}
        </InlineFormLabel>
        {renderEditor(internalProps, props, onChange)}
      </div>
    );
  };
};

const renderEditor = (
  intrenalProps: QueryEditorInternalProps,
  props: QueryEditorSectionProps,
  onChange: (expression: QueryEditorExpression) => void
) => {
  if (intrenalProps.conditionals.length === 0 && intrenalProps.operators.length === 0) {
    return <QueryEditorField fields={props.options} onChange={onChange} />;
  }

  if (intrenalProps.conditionals.length === 0 && intrenalProps.operators.length > 0) {
    return (
      <QueryEditorFieldAndOperator operators={intrenalProps.operators} fields={props.options} onChange={onChange} />
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
