import React, { useCallback, useMemo } from 'react';
import { css } from 'emotion';
import { Select, stylesFactory } from '@grafana/ui';
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
  const styles = getStyles();
  const onChange = useOnChange(props);
  const options = useOptions(props.fields);
  const value = props.value?.name;

  return (
    <div className={styles.container}>
      <Select
        width={30}
        onChange={onChange}
        value={value}
        options={props.templateVariableOptions ? [props.templateVariableOptions, ...options] : options}
        placeholder={props.placeholder}
        menuPlacement="bottom"
        allowCustomValue={props.allowCustom}
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

const useOnChange = (props: Props) => {
  return useCallback(
    (selectable: SelectableValue<string>) => {
      if (!selectable || typeof selectable.value !== 'string') {
        return;
      }

      const { value } = selectable;
      let field: QueryEditorPropertyDefinition | undefined = props.fields.find(o => o.value === value);

      if (!field) {
        field = props.templateVariableOptions?.options.find(o => o.value === value);
      }

      if (!field && value && props.allowCustom) {
        field = {
          value,
          type: QueryEditorPropertyType.String,
        };
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
