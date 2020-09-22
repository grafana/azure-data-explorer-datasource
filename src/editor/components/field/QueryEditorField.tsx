import React, { useCallback, useMemo } from 'react';
import { css } from 'emotion';
import { stylesFactory, AsyncSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

import { QueryEditorPropertyDefinition, QueryEditorProperty, QueryEditorPropertyType } from '../../types';

interface Props {
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions?: SelectableValue<string>;
  value?: QueryEditorProperty;
  onChange: (property: QueryEditorProperty) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

export const definitionToProperty = (definition: QueryEditorPropertyDefinition): QueryEditorProperty => {
  return {
    name: definition.value,
    type: definition.type,
  };
};

export const QueryEditorField: React.FC<Props> = props => {
  const { value: propsValue, fields, allowCustom, placeholder, templateVariableOptions } = props;
  const styles = getStyles();
  const onChange = useOnChange(props);
  const options = useOptions(fields);
  const value = useMemo(() => options.find(option => option.value === propsValue?.name), [options, propsValue]);
  const loadOptions = useMemo(() => filterOptions(options, templateVariableOptions), [
    options,
    templateVariableOptions,
  ]);

  return (
    <div className={styles.container}>
      <AsyncSelect
        width={30}
        onChange={onChange}
        value={value}
        defaultOptions={options}
        loadOptions={loadOptions}
        placeholder={placeholder}
        menuPlacement="bottom"
        allowCustomValue={allowCustom}
        backspaceRemovesValue={true}
        isClearable={true}
      />
    </div>
  );
};

const getStyles = stylesFactory(() => {
  return {
    container: css`
      margin-right: 4px;
    `,
  };
});

// Should remove this when I have fixed the underlying issue in the select component
// it should use value as label if label is missing.
const useOptions = (options: QueryEditorPropertyDefinition[]): Array<SelectableValue<string>> => {
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

const useOnChange = ({ fields, allowCustom, templateVariableOptions, onChange }: Props) => {
  return useCallback(
    (selectable: SelectableValue<string>) => {
      if (!selectable || typeof selectable.value !== 'string') {
        const name: any = null;
        const type = QueryEditorPropertyType.String;
        onChange({ name, type });
        return;
      }

      const { value } = selectable;
      let field: QueryEditorPropertyDefinition | undefined = fields.find(o => o.value === value);

      if (!field) {
        field = templateVariableOptions?.options?.find(o => o.value === value);
      }

      if (!field && value && allowCustom) {
        field = {
          value,
          type: QueryEditorPropertyType.String,
        };
      }

      if (field) {
        onChange({
          name: field.value,
          type: field.type,
        });
      }
    },
    [fields, onChange, templateVariableOptions, allowCustom]
  );
};

export const filterOptions = (
  options: Array<SelectableValue<string>>,
  templateVariableOptions?: SelectableValue<string>
) => async (textSearchingFor: string) => {
  const text = textSearchingFor.toLowerCase();
  const allOptions = templateVariableOptions ? [templateVariableOptions, ...options] : options;
  const exactMatchOptions = allOptions.filter(option => option.label?.toLowerCase().startsWith(text));
  const anyMatchOptions = allOptions.filter(option => option.label?.toLowerCase().indexOf(text, 1) !== -1);
  const sortedOptions = exactMatchOptions.concat(anyMatchOptions);
  const uniqueOptions = [...new Set(sortedOptions)];

  return uniqueOptions;
};
