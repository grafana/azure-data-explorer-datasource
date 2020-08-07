import React, { useCallback, useMemo } from 'react';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryEditorFieldDefinition } from '../../types';
import { QueryEditorProperty } from '../../expressions';

interface Props {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value?: QueryEditorProperty;
  onChange: (property: QueryEditorProperty) => void;
  placeholder?: string;
}

export const QueryEditorField: React.FC<Props> = props => {
  const onChange = useOnChange(props);
  const options = useOptions(props.fields);
  const value = props.value?.name;

  return (
    <Select
      width={30}
      onChange={onChange}
      value={value}
      options={[props.templateVariableOptions, ...options]}
      placeholder={props.placeholder}
      menuPlacement="bottom"
    />
  );
};

// Should remove this when I have fixed the underlying issue in the select component
// it should use value as label if label is missing.
const useOptions = (options: QueryEditorFieldDefinition[]): Array<SelectableValue<string>> => {
  return useMemo(() => {
    if (!options) {
      return [];
    }

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
      let field = props.fields.find(o => o.value === value);
      if (!field) {
        field = props.templateVariableOptions.options.find(o => o.value === value);
      }

      if (field) {
        props.onChange({
          name: field.value,
          type: field.type,
        });
      }
    },
    [props]
  );
};
