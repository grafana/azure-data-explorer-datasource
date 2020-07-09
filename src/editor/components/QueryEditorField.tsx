import React, { useState, useCallback, useMemo } from 'react';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryEditorExpression, QueryEditorExpressionType } from './types';
import { QueryEditorFieldDefinition } from '../types';

interface Props {
  id: string;
  options: QueryEditorFieldDefinition[];
  onChange: (expression: QueryEditorFieldExpression) => void;
}

export interface QueryEditorFieldExpression extends QueryEditorExpression {
  field: QueryEditorFieldDefinition;
}

export const QueryEditorField: React.FC<Props> = props => {
  const [field, setField] = useState(props.options[0]?.value || '');
  const onChange = useOnChange(props, setField);
  const options = useOptions(props.options);

  return <Select width={30} onChange={onChange} value={field} options={options} />;
};

// Should remove this when I have fixed the underlying issue in the select component
// it should use value as label if label is missing.
const useOptions = (options: QueryEditorFieldDefinition[]): Array<SelectableValue<string>> => {
  return useMemo(() => {
    return options.map(option => {
      return {
        label: option.label ?? option.value,
        value: option.value,
        type: option.fieldType,
      };
    });
  }, [options]);
};

const useOnChange = (props: Props, setField: React.Dispatch<React.SetStateAction<string>>) => {
  return useCallback(
    (selectable: SelectableValue<string>) => {
      if (!selectable || typeof selectable.value !== 'string') {
        return;
      }

      setField(selectable.value);
      const option = props.options.find(option => option.value === selectable.value);

      if (option) {
        props.onChange({
          type: QueryEditorExpressionType.Field,
          field: option,
          id: props.id,
        });
      }
    },
    [props.onChange, props.id, setField, props.options]
  );
};

export const isField = (expression: QueryEditorExpression): expression is QueryEditorFieldExpression => {
  return (expression as QueryEditorFieldExpression)?.type === QueryEditorExpressionType.Field;
};
