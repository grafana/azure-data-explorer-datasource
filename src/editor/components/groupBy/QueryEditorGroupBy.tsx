import React, { useCallback, useEffect, useState } from 'react';
import { css } from 'emotion';
import { stylesFactory } from '@grafana/ui';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from '../../types';
import { QueryEditorField, QueryEditorFieldExpression } from '../field/QueryEditorField';
import { QueryEditorExpression, QueryEditorExpressionType } from '../../../types';
import { SelectableValue } from '@grafana/data';

interface Props {
  fields: QueryEditorFieldDefinition[];
  templateVariableOptions: SelectableValue<string>;
  intervals: QueryEditorFieldDefinition[];
  value?: QueryEditorGroupByExpression;
  label?: string;
  onChange: (expression: QueryEditorGroupByExpression) => void;
}

export interface QueryEditorGroupByExpression extends QueryEditorExpression {
  field: QueryEditorFieldExpression;
  interval?: QueryEditorFieldExpression;
}

export const QueryEditorGroupBy: React.FC<Props> = props => {
  const [field, setField] = useState(props.value?.field);
  const [interval, setInterval] = useState(props.value?.interval);
  const styles = getStyles();

  const onChangeField = useCallback(
    (expression: QueryEditorFieldExpression) => {
      setField(expression);
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

export const isGroupBy = (expression: QueryEditorExpression): expression is QueryEditorGroupByExpression => {
  return (expression as QueryEditorGroupByExpression)?.type === QueryEditorExpressionType.GroupBy;
};

export const isDateGroupBy = (expression: QueryEditorExpression): boolean => {
  return (expression as QueryEditorGroupByExpression)?.field?.fieldType === QueryEditorFieldType.DateTime;
};

const getStyles = stylesFactory(() => {
  return {
    container: css`
      display: flex;
      flex-direction: row;
    `,
  };
});
