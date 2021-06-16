import React, { useCallback, useEffect, useState } from 'react';
import { css } from 'emotion';
import { stylesFactory } from '@grafana/ui';
import { QueryEditorPropertyDefinition, QueryEditorPropertyType, QueryEditorProperty } from '../../types';
import { QueryEditorField } from '../field/QueryEditorField';
import { SelectableValue } from '@grafana/data';
import { QueryEditorGroupByExpression, QueryEditorExpressionType } from '../../expressions';

interface Props {
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  intervals: QueryEditorPropertyDefinition[];
  value?: QueryEditorGroupByExpression;
  onChange: (expression: QueryEditorGroupByExpression) => void;
}

export const QueryEditorGroupBy = (props: Props) => {
  const { intervals, onChange } = props;
  const [field, setField] = useState(props.value?.property);
  const [interval, setInterval] = useState(props.value?.interval);
  const styles = getStyles();

  const onChangeField = useCallback(
    (property: QueryEditorProperty) => {
      setField(property);
      if (property.type === QueryEditorPropertyType.DateTime) {
        setInterval({
          type: QueryEditorPropertyType.Interval,
          name: intervals[0].value,
        });
      }
    },
    [setField, intervals]
  );

  const onChangeInterval = useCallback(
    (property: QueryEditorProperty) => {
      setInterval(property);
    },
    [setInterval]
  );

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (field) {
      const payload: QueryEditorGroupByExpression = {
        type: QueryEditorExpressionType.GroupBy,
        property: field,
        interval,
      };

      onChange(payload); // adding onChange to dependency array below causes maximum call depth error
    }
  }, [field, interval]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <div className={styles.container}>
      <QueryEditorField
        value={field}
        fields={props.fields}
        templateVariableOptions={props.templateVariableOptions}
        onChange={onChangeField}
        placeholder="Choose column..."
      />
      {field?.type === QueryEditorPropertyType.DateTime && (
        <QueryEditorField
          value={interval}
          fields={props.intervals}
          templateVariableOptions={props.templateVariableOptions}
          onChange={onChangeInterval}
          placeholder="Choose interval"
          allowCustom={true}
        />
      )}
    </div>
  );
};

const getStyles = stylesFactory(() => {
  return {
    container: css`
      display: flex;
      flex-direction: row;
    `,
  };
});
