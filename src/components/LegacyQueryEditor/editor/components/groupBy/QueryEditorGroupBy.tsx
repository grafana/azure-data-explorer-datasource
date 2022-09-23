import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import React, { useCallback, useEffect, useState } from 'react';

import { QueryEditorExpressionType, QueryEditorGroupByExpression } from '../../expressions';
import {
  QueryEditorProperty,
  QueryEditorPropertyDefinition,
  QueryEditorPropertyType,
} from '../../../../../schema/types';
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

  useEffect(() => {
    if (props.value) {
      setField(props.value.property);
      setInterval(props.value.interval);
    }
  }, [props.value]);

  const onChangeField = useCallback(
    (property: QueryEditorProperty) => {
      setField(property);
      if (property.type === QueryEditorPropertyType.DateTime) {
        setInterval({
          type: QueryEditorPropertyType.Interval,
          name: intervals[0].value,
        });
      }
      onChange({
        type: QueryEditorExpressionType.GroupBy,
        property,
        interval,
      });
    },
    [setField, onChange, interval, intervals]
  );

  const onChangeInterval = useCallback(
    (property: QueryEditorProperty) => {
      setInterval(property);
      if (field) {
        onChange({
          type: QueryEditorExpressionType.GroupBy,
          property: field,
          interval: property,
        });
      }
    },
    [setInterval, field, onChange]
  );

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
