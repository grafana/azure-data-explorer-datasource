import React from 'react';
import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionProps } from '../QueryEditorSection';
import { QueryEditorSectionRenderer } from '../QueryEditorSectionRenderer';
import { SelectableValue } from '@grafana/data';
import { ExpressionSuggestor } from '../types';
import { QueryEditorExpression } from '../../expressions';

interface ReduceSectionConfiguration {
  defaultValue: QueryEditorExpression;
  functions: QueryEditorFieldDefinition[];
}

export interface QueryEditorReduceSectionProps extends QueryEditorSectionProps {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value?: QueryEditorExpression;
  getSuggestions: ExpressionSuggestor;
  onChange: (value: QueryEditorExpression) => void;
}

export const QueryEditorReduceSection = (
  config: ReduceSectionConfiguration
): React.FC<QueryEditorReduceSectionProps> => {
  return props => {
    const expression = props.value ?? config.defaultValue;

    return (
      <QueryEditorSection label={props.label}>
        <QueryEditorSectionRenderer<ReduceSectionConfiguration>
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
