import React from 'react';

import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionBaseProps } from '../QueryEditorSection';
import { QueryEditorField, isField } from './QueryEditorField';
import { QueryEditorExpression, QueryEditorSectionExpression } from '../../../types';
import { SelectableValue } from '@grafana/data';

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

    if (!isField(expression)) {
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
