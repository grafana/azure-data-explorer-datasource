import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { AsyncSelect, useStyles2 } from '@grafana/ui';
import React, { useCallback, useMemo, useState } from 'react';

import { QueryEditorProperty, QueryEditorPropertyDefinition, QueryEditorPropertyType } from '../../types';

interface Props {
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions?: SelectableValue<string>;
  value?: QueryEditorProperty;
  onChange: (property: QueryEditorProperty) => void;
  placeholder?: string;
  allowCustom?: boolean;
  'aria-label'?: string;
}

export const definitionToProperty = (definition: QueryEditorPropertyDefinition): QueryEditorProperty => {
  return {
    name: definition.value,
    type: definition.type,
  };
};

export const QueryEditorField: React.FC<Props> = (props) => {
  const {
    value: propsValue,
    fields,
    allowCustom,
    placeholder,
    templateVariableOptions,
    onChange: propsOnChange,
  } = props;
  const [prevValue, setPrevValue] = useState<QueryEditorProperty>(null as unknown as QueryEditorProperty);
  const styles = useStyles2(getStyles);
  const options = useOptions(fields);
  const value = useMemo(() => options.find((option) => option.value === propsValue?.name), [options, propsValue]);
  const loadOptions = useMemo(
    () => filterOptions(options, templateVariableOptions),
    [options, templateVariableOptions]
  );
  const onChange = useOnChange(props, propsValue, setPrevValue);
  const onCloseMenu = useCallback(() => {
    if (!value && prevValue) {
      propsOnChange({ ...prevValue });
    }

    setPrevValue(null as unknown as QueryEditorProperty);
  }, [propsOnChange, setPrevValue, prevValue, value]);

  return (
    <div className={styles.container}>
      <AsyncSelect
        width={30}
        onChange={onChange}
        value={value}
        defaultOptions={templateVariableOptions ? [templateVariableOptions, ...options] : options}
        loadOptions={loadOptions}
        placeholder={placeholder}
        menuPlacement="bottom"
        allowCustomValue={allowCustom}
        backspaceRemovesValue={true}
        isClearable={true}
        onCloseMenu={onCloseMenu}
        aria-label={props['aria-label']}
      />
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    margin-right: 4px;
  `,
});

// Should remove this when I have fixed the underlying issue in the select component
// it should use value as label if label is missing.
const useOptions = (options: QueryEditorPropertyDefinition[]): Array<SelectableValue<string>> => {
  return useMemo(() => {
    if (!options) {
      return [];
    }

    return options.map((option) => {
      return {
        label: option.label ?? option.value,
        value: option.value,
        type: option.type,
      };
    });
  }, [options]);
};

const useOnChange = (
  { fields, allowCustom, templateVariableOptions, onChange }: Props,
  currentValue: QueryEditorProperty | undefined,
  setPrevValue: (value: QueryEditorProperty) => void
) => {
  return useCallback(
    (selectable: SelectableValue<string>) => {
      if (!selectable || (typeof selectable.value !== 'string' && currentValue)) {
        const name: any = null;
        const type = QueryEditorPropertyType.String;

        onChange({ name, type });
        if (currentValue) {
          setPrevValue(currentValue);
        }

        return;
      }

      const { value } = selectable;
      let field: QueryEditorPropertyDefinition | undefined = fields.find((o) => o.value === value);

      if (!field) {
        field = templateVariableOptions?.options?.find((o) => o.value === value);
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
    [fields, onChange, templateVariableOptions, allowCustom, currentValue, setPrevValue]
  );
};

export const filterOptions =
  (options: Array<SelectableValue<string>>, templateVariableOptions?: SelectableValue<string>) =>
  async (textSearchingFor: string) => {
    const text = textSearchingFor.toLowerCase();
    const allOptions = templateVariableOptions ? [templateVariableOptions, ...options] : options;
    const exactMatchOptions = allOptions.filter((option) => option.label?.toLowerCase().startsWith(text));
    const anyMatchOptions = allOptions.filter((option) => option.label?.toLowerCase().indexOf(text, 1) !== -1);
    const sortedOptions = exactMatchOptions.concat(anyMatchOptions);
    const uniqueOptions = [...new Set(sortedOptions)];

    return uniqueOptions;
  };
