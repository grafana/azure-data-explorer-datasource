import React from 'react';
import { QueryEditorExpression } from './types';
import { QueryEditorFieldDefinition } from '../types';
import { QueryEditorSection, QueryEditorSectionExpression, QueryEditorSectionBaseProps } from './QueryEditorSection';
import { QueryEditorField, isField } from './QueryEditorField';

interface FieldSectionConfiguration {
  id: string;
  expression: QueryEditorExpression;
}

export interface QueryEditorFieldSectionProps extends QueryEditorSectionBaseProps {
  fields: QueryEditorFieldDefinition[];
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
        {({ onChange }) => <QueryEditorField fields={props.fields} onChange={onChange} value={expression} />}
      </QueryEditorSection>
    );
  };
};
