import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from 'emotion';
import React, { useCallback, useEffect, useState } from 'react';

import { QueryEditorExpressionType, QueryEditorGroupByExpression } from '../../expressions';
import { QueryEditorProperty, QueryEditorPropertyDefinition, QueryEditorPropertyType } from '../../types';
import { QueryEditorField } from '../field/QueryEditorField';

interface Props {
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  intervals: QueryEditorPropertyDefinition[];
  value?: QueryEditorGroupByExpression;
  onChange: (expression: QueryEditorGroupByExpression) => void;
}

export const QueryEditorGroupBy: React.FC<Props> = (props) => {
  const { intervals, onChange } = props;
  const [field, setField] = useState(props.value?.property);
  const [interval, setInterval] = useState(props.value?.interval);
  const styles = useStyles2(getStyles);

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

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    display: flex;
    flex-direction: row;
  `,
});
