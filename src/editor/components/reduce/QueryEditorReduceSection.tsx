import React from 'react';
import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionBaseProps } from '../QueryEditorSection';
import {QueryEditorExpression, QueryEditorSectionExpression} from '../../../types';
import {QueryEditorSectionRenderer} from "../filter/QueryEditorSectionRenderer";

interface ReduceSectionConfiguration {
  id: string;
  defaultValue: QueryEditorExpression;
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
    
    return (
      <QueryEditorSection id={config.id} label={props.label} onChange={props.onChange}>
        {({ onChange }) => (
          <QueryEditorSectionRenderer<ReduceSectionConfiguration>
            expression={expression}
            fields={props.fields}
            onChange={onChange}
            config={config}
          />
        )}
      </QueryEditorSection>
    );
  };
};
