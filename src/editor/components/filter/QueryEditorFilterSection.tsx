import React from 'react';
import { QueryEditorExpression } from '../types';
import { QueryEditorOperatorDefinition, QueryEditorCondition, QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSectionRenderer } from './QueryEditorSectionRenderer';
import { QueryEditorSectionBaseProps, QueryEditorSectionExpression, QueryEditorSection } from '../QueryEditorSection';

interface FilterSectionConfiguration {
  id: string;
  operators: QueryEditorOperatorDefinition[];
  conditionals: QueryEditorCondition[];
  expression: QueryEditorExpression;
}

export interface QueryEditorFilterSectionProps extends QueryEditorSectionBaseProps {
  fields: QueryEditorFieldDefinition[];
  value?: QueryEditorSectionExpression;
}

export const QueryEditorFilterSection = (
  config: FilterSectionConfiguration
): React.FC<QueryEditorFilterSectionProps> => {
  return props => {
    const expression = props.value?.expression ?? config.expression;

    return (
      <QueryEditorSection id={config.id} label={props.label} onChange={props.onChange}>
        {({ onChange }) => (
          <QueryEditorSectionRenderer
            expression={expression}
            fields={props.fields}
            onChange={onChange}
            operators={config.operators}
            conditionals={config.conditionals}
          />
        )}
      </QueryEditorSection>
    );
  };
};
