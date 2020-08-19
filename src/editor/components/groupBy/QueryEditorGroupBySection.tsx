import React from 'react';
import { QueryEditorPropertyDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionProps } from '../QueryEditorSection';
import { QueryEditorSectionRenderer } from '../QueryEditorSectionRenderer';
import { SelectableValue } from '@grafana/data';
import { ExpressionSuggestor } from '../types';
import { QueryEditorExpression } from '../../expressions';

interface GroupBySectionConfiguration {
  defaultValue: QueryEditorExpression;
  intervals: QueryEditorPropertyDefinition[];
}

export interface QueryEditorGroupBySectionProps extends QueryEditorSectionProps {
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value?: QueryEditorExpression;
  onChange: (value: QueryEditorExpression) => void;
  getSuggestions: ExpressionSuggestor;
}

export const QueryEditorGroupBySection = (
  config: GroupBySectionConfiguration
): React.FC<QueryEditorGroupBySectionProps> => {
  return props => {
    const expression = props.value ?? config.defaultValue;

    return (
      <QueryEditorSection label={props.label}>
        <QueryEditorSectionRenderer<GroupBySectionConfiguration>
          expression={expression}
          fields={props.fields}
          templateVariableOptions={props.templateVariableOptions}
          onChange={props.onChange}
          config={config}
          getSuggestions={props.getSuggestions}
        />
      </QueryEditorSection>
    );
  };
};
