import React from 'react';
import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionBaseProps } from '../QueryEditorSection';
import { QueryEditorExpression, QueryEditorSectionExpression } from '../../../types';
import { QueryEditorSectionRenderer } from '../filter/QueryEditorSectionRenderer';

interface GroupBySectionConfiguration {
  id: string;
  defaultValue: QueryEditorExpression;
  intervals: QueryEditorFieldDefinition[];
}

export interface QueryEditorGroupBySectionProps extends QueryEditorSectionBaseProps {
  fields: QueryEditorFieldDefinition[];
  value?: QueryEditorSectionExpression;
}

export const QueryEditorGroupBySection = (
  config: GroupBySectionConfiguration
): React.FC<QueryEditorGroupBySectionProps> => {
  return props => {
    const expression = props.value?.expression ?? config.defaultValue;

    return (
      <QueryEditorSection id={config.id} label={props.label} onChange={props.onChange}>
        {({ onChange }) => (
          <QueryEditorSectionRenderer<GroupBySectionConfiguration>
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
