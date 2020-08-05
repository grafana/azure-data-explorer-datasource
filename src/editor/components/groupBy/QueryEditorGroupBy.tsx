import React, { useCallback, useEffect, useState } from 'react';
import { css } from 'emotion';
import { stylesFactory } from '@grafana/ui';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from '../../types';
import { QueryEditorField } from '../field/QueryEditorField';
import { QueryEditorExpressionType } from '../../../types';
import { SelectableValue } from '@grafana/data';
import { QueryEditorGroupByExpression, QueryEditorFieldExpression } from '../../expressions';

interface Props {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  intervals: QueryEditorFieldDefinition[];
  value?: QueryEditorGroupByExpression;
  label?: string;
  onChange: (expression: QueryEditorGroupByExpression) => void;
}

export const QueryEditorGroupBy: React.FC<Props> = props => {
  const [field, setField] = useState(props.value?.field);
  const [interval, setInterval] = useState(props.value?.interval);
  const styles = getStyles();

  const onChangeField = useCallback(
    (expression: QueryEditorFieldExpression) => {
      setField(expression);
      if (expression.fieldType === QueryEditorFieldType.DateTime) {
        setInterval({
          type: QueryEditorExpressionType.Field,
          fieldType: QueryEditorFieldType.Interval,
          value: props.intervals[0].value,
        });
      }
    },
    [setField]
  );

  const onChangeInterval = useCallback(
    (expression: QueryEditorFieldExpression) => {
      setInterval(expression);
    },
    [setInterval]
  );

  useEffect(() => {
    if (field) {
      const payload = {
        type: QueryEditorExpressionType.GroupBy,
        field,
        interval,
      };

      props.onChange(payload);
    }
  }, [field, interval]);

  return (
    <div className={styles.container}>
      <QueryEditorField
        value={field}
        fields={props.fields}
        templateVariableOptions={props.templateVariableOptions}
        onChange={onChangeField}
        placeholder="Choose column..."
      />
      {field?.fieldType === QueryEditorFieldType.DateTime && (
        <QueryEditorField
          value={interval}
          fields={props.intervals}
          templateVariableOptions={props.templateVariableOptions}
          onChange={onChangeInterval}
          placeholder="Choose interval"
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
