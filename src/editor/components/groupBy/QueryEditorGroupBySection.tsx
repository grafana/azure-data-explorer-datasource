import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Button, useStyles2 } from '@grafana/ui';
import React from 'react';

import { QueryEditorArrayExpression, QueryEditorExpression } from '../../expressions';
import { isGroupBy } from '../../guards';
import { QueryEditorPropertyDefinition } from '../../types';
import { QueryEditorRepeater } from '../QueryEditorRepeater';
import { QueryEditorSection, QueryEditorSectionProps } from '../QueryEditorSection';
import { QueryEditorGroupBy } from './QueryEditorGroupBy';

interface GroupBySectionConfiguration {
  defaultValue: QueryEditorExpression;
  intervals: QueryEditorPropertyDefinition[];
}

export interface QueryEditorGroupBySectionProps extends QueryEditorSectionProps {
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value: QueryEditorArrayExpression;
  onChange: (value: QueryEditorArrayExpression) => void;
}

export const QueryEditorGroupBySection = (
  config: GroupBySectionConfiguration
): React.FC<QueryEditorGroupBySectionProps> => {
  return function F(props) {
    const styles = useStyles2(getStyles);

    if (props.value.expressions.length === 0) {
      return (
        <QueryEditorSection label={props.label}>
          <Button
            variant="secondary"
            onClick={() => {
              const expression: QueryEditorArrayExpression = {
                ...props.value,
                expressions: [config.defaultValue],
              };
              props.onChange(expression);
            }}
            icon="plus"
          />
        </QueryEditorSection>
      );
    }

    return (
      <QueryEditorSection label={props.label}>
        <div className={styles.container}>
          <QueryEditorRepeater id="group-by" onChange={props.onChange} value={props.value}>
            {(childProps) => {
              if (!isGroupBy(childProps.value)) {
                return null;
              }

              const isFirst = childProps.index === 0;
              const rowStyle = isFirst ? styles.row : styles.rowWithSpacing;

              return (
                <div className={rowStyle}>
                  <QueryEditorGroupBy
                    onChange={childProps.onChange}
                    value={childProps.value}
                    templateVariableOptions={props.templateVariableOptions}
                    fields={props.fields}
                    intervals={config.intervals}
                  />
                  <Button className={styles.spacing} variant="secondary" onClick={childProps.onRemove} icon="minus" />
                  {isFirst && (
                    <Button variant="secondary" onClick={() => childProps.onAdd(config.defaultValue)} icon="plus" />
                  )}
                </div>
              );
            }}
          </QueryEditorRepeater>
        </div>
      </QueryEditorSection>
    );
  };
};

const getStyles = (theme: GrafanaTheme2) => {
  const row = css`
    display: flex;
    flex-direction: row;
  `;

  return {
    container: css`
      display: flex;
      flex-direction: column;
    `,
    row: row,
    rowWithSpacing: css`
      ${row}
      margin-top: 4px;
    `,
    spacing: css`
      margin-right: 4px;
    `,
  };
};
