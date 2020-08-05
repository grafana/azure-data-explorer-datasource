import React from 'react';
import { SelectableValue } from '@grafana/data';
import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionBaseProps } from '../QueryEditorSection';
import { QueryEditorField } from './QueryEditorField';
import { isFieldExpression } from '../../guards';
import { QueryEditorExpression, QueryEditorSectionExpression } from '../../expressions';

interface FieldSectionConfiguration {
  id: string;
  expression: QueryEditorExpression;
}

export interface QueryEditorFieldSectionProps extends QueryEditorSectionBaseProps {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value?: QueryEditorSectionExpression;
}

export const QueryEditorFieldSection = (config: FieldSectionConfiguration): React.FC<QueryEditorFieldSectionProps> => {
  return props => {
    const expression = props.value?.expression ?? config.expression;

    if (!isFieldExpression(expression)) {
      return null;
    }

    return (
      <QueryEditorSection id={config.id} label={props.label} onChange={props.onChange}>
        {({ onChange }) => (
          <QueryEditorField
            fields={props.fields}
            templateVariableOptions={props.templateVariableOptions}
            onChange={onChange}
            value={expression}
          />
        )}
      </QueryEditorSection>
    );
  };
};
