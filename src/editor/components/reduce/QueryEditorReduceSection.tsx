import React from 'react';
import { css } from 'emotion';
import { QueryEditorPropertyDefinition } from '../../types';
import { QueryEditorSection, QueryEditorSectionProps } from '../QueryEditorSection';
import { SelectableValue } from '@grafana/data';
import { QueryEditorExpression, QueryEditorArrayExpression } from '../../expressions';
import { isReduceExpression } from 'editor/guards';
import { QueryEditorReduce } from './QueryEditorReduce';
import { Button, stylesFactory } from '@grafana/ui';
import { QueryEditorRepeater } from '../QueryEditorRepeater';

interface ReduceSectionConfiguration {
  defaultValue: QueryEditorExpression;
  functions: QueryEditorPropertyDefinition[];
}

export interface QueryEditorReduceSectionProps extends QueryEditorSectionProps {
  fields: QueryEditorPropertyDefinition[];
  templateVariableOptions: SelectableValue<string>;
  value: QueryEditorArrayExpression;
  onChange: (value: QueryEditorArrayExpression) => void;
}

export const QueryEditorReduceSection = (
  config: ReduceSectionConfiguration
): React.FC<QueryEditorReduceSectionProps> => {
  return props => {
    const styles = getStyles();

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
          <QueryEditorRepeater id="reduce" onChange={props.onChange} value={props.value}>
            {childProps => {
              if (!isReduceExpression(childProps.value)) {
                return null;
              }

              const isFirst = childProps.index === 0;
              const rowStyle = isFirst ? styles.row : styles.rowWithSpacing;

              return (
                <div className={rowStyle}>
                  <QueryEditorReduce
                    onChange={childProps.onChange}
                    value={childProps.value}
                    templateVariableOptions={props.templateVariableOptions}
                    fields={props.fields}
                    functions={config.functions}
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

const getStyles = stylesFactory(() => {
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
});
