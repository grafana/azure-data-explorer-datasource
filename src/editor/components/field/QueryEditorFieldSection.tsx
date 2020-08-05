import React from 'react';
import { SelectableValue } from '@grafana/data';
import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionProps } from '../QueryEditorSection';
import { QueryEditorField } from './QueryEditorField';
import { isFieldExpression } from '../../guards';
import { QueryEditorExpression } from '../../expressions';

interface FieldSectionConfiguration {
  defaultValue: QueryEditorExpression;
}

export interface QueryEditorFieldSectionProps extends QueryEditorSectionProps {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value?: QueryEditorExpression;
  onChange: (value: QueryEditorExpression) => void;
}

export const QueryEditorFieldSection = (config: FieldSectionConfiguration): React.FC<QueryEditorFieldSectionProps> => {
  return props => {
    const expression = props.value ?? config.defaultValue;

    if (!isFieldExpression(expression)) {
      return null;
    }

    return (
      <QueryEditorSection label={props.label}>
        <QueryEditorField
          fields={props.fields}
          templateVariableOptions={props.templateVariableOptions}
          onChange={props.onChange}
          value={expression}
        />
      </QueryEditorSection>
    );
  };
};
