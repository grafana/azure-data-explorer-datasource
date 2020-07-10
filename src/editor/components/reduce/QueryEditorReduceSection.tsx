import React from 'react';
import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionExpression, QueryEditorSectionBaseProps } from '../QueryEditorSection';
import { isReduce, QueryEditorReduce, QueryEditorReduceExpression } from './QueryEditorReduce';

interface ReduceSectionConfiguration {
  id: string;
  defaultValue: QueryEditorReduceExpression;
  functions: QueryEditorFieldDefinition[];
}

export interface QueryEditorReduceSectionProps extends QueryEditorSectionBaseProps {
  fields: QueryEditorFieldDefinition[];
  value?: QueryEditorSectionExpression;
  reduceLabel?: string;
}

export const QueryEditorReduceSection = (
  config: ReduceSectionConfiguration
): React.FC<QueryEditorReduceSectionProps> => {
  return props => {
    const expression = props.value?.expression ?? config.defaultValue;

    if (!isReduce(expression)) {
      return null;
    }

    return (
      <QueryEditorSection id={config.id} label={props.label} onChange={props.onChange}>
        {({ onChange }) => (
          <QueryEditorReduce
            label={props.reduceLabel}
            functions={config.functions}
            fields={props.fields}
            onChange={onChange}
            value={expression}
          />
        )}
      </QueryEditorSection>
    );
  };
};
