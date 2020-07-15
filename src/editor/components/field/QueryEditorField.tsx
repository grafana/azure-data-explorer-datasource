import React, { useCallback, useMemo } from 'react';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from '../../types';
import { QueryEditorExpression, QueryEditorExpressionType } from '../../../types';

interface Props {
  fields: QueryEditorFieldDefinition[];
  value?: QueryEditorFieldExpression;
  onChange: (expression: QueryEditorFieldExpression) => void;
  placeholder?: string;
}

export interface QueryEditorFieldExpression extends QueryEditorExpression {
  value: string;
  fieldType: QueryEditorFieldType;
}

export const QueryEditorField: React.FC<Props> = props => {
  const onChange = useOnChange(props);
  const options = useOptions(props.fields);
  const value = props.value?.value;

  return <Select width={30} onChange={onChange} value={value} options={options} placeholder={props.placeholder} />;
};

// Should remove this when I have fixed the underlying issue in the select component
// it should use value as label if label is missing.
const useOptions = (options: QueryEditorFieldDefinition[]): Array<SelectableValue<string>> => {
  return useMemo(() => {
    return options.map(option => {
      return {
        label: option.label ?? option.value,
        value: option.value,
        type: option.type,
      };
    });
  }, [options]);
};

const useOnChange = (props: Props) => {
  return useCallback(
    (selectable: SelectableValue<string>) => {
      if (!selectable || typeof selectable.value !== 'string') {
        return;
      }

      const { value } = selectable;
      const field = props.fields.find(o => o.value === value);

      if (field) {
        props.onChange({
          type: QueryEditorExpressionType.Field,
          value: field.value,
          fieldType: field.type,
        });
      }
    },
    [props]
  );
};

export const isField = (expression: QueryEditorExpression): expression is QueryEditorFieldExpression => {
  return (expression as QueryEditorFieldExpression)?.type === QueryEditorExpressionType.Field;
};
