import React from 'react';
import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionBaseProps } from '../QueryEditorSection';
import { QueryEditorExpression, QueryEditorSectionExpression } from '../../../types';
import { QueryEditorSectionRenderer } from '../filter/QueryEditorSectionRenderer';
import { SelectableValue } from '@grafana/data';
import { ExpressionSuggestor } from '../types';

interface GroupBySectionConfiguration {
  id: string;
  defaultValue: QueryEditorExpression;
  intervals: QueryEditorFieldDefinition[];
}

export interface QueryEditorGroupBySectionProps extends QueryEditorSectionBaseProps {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value?: QueryEditorSectionExpression;
  getSuggestions: ExpressionSuggestor;
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
            templateVariableOptions={props.templateVariableOptions}
            onChange={onChange}
            config={config}
            getSuggestions={props.getSuggestions}
          />
        )}
      </QueryEditorSection>
    );
  };
};
