import React from 'react';
import { SelectableValue } from '@grafana/data';

import { QueryEditorExpression, QueryEditorExpressionType, QueryEditorPropertyExpression } from '../../expressions';
import { isFieldExpression } from '../../guards';
import { QueryEditorProperty, QueryEditorPropertyDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionProps } from '../QueryEditorSection';
import { QueryEditorField } from './QueryEditorField';

interface FieldSectionConfiguration {
  defaultValue: QueryEditorExpression;
}

export interface QueryEditorFieldSectionProps extends React.PropsWithChildren<QueryEditorSectionProps> {
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value?: QueryEditorExpression;
  onChange: (value: QueryEditorExpression) => void;
  allowCustom?: boolean;
}

export const QueryEditorFieldSection = (config: FieldSectionConfiguration): React.FC<QueryEditorFieldSectionProps> => {
  return (props) => {
    const { onChange: propsOnChange } = props;
    const expression = props.value ?? config.defaultValue;

    if (!isFieldExpression(expression)) {
      return null;
    }

    return (
      <QueryEditorSection label={props.label}>
        <QueryEditorField
          fields={props.fields}
          templateVariableOptions={props.templateVariableOptions}
          onChange={onChange(propsOnChange)}
          value={expression.property}
          allowCustom={props.allowCustom}
        />
        {props.children}
      </QueryEditorSection>
    );
  };
};

const onChange = (propsOnChange: (value: QueryEditorExpression) => void) => (property: QueryEditorProperty) => {
  propsOnChange({
    type: QueryEditorExpressionType.Property,
    property,
  } as QueryEditorPropertyExpression);
};
