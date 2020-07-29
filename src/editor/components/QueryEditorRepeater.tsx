import { css } from 'emotion';
import React, { PureComponent, useCallback } from 'react';
import { Button, stylesFactory } from '@grafana/ui';
import { QueryEditorExpression, QueryEditorExpressionType } from '../../types';

interface Props {
  children: (props: ChildProps) => React.ReactElement;
  value: QueryEditorRepeaterExpression;
  onChange: (expression: QueryEditorRepeaterExpression) => void;
}

interface ChildProps {
  value: QueryEditorExpression | undefined;
  onChange: (expression: QueryEditorExpression | undefined) => void;
}

export interface QueryEditorRepeaterExpression extends QueryEditorExpression {
  typeToRepeat: QueryEditorExpressionType;
  expressions: QueryEditorExpression[];
}

export class QueryEditorRepeater extends PureComponent<Props> {
  onChangeValue = (expression: QueryEditorExpression | undefined, index: number) => {
    if (!expression) {
      return;
    }

    const { value, onChange } = this.props;

    const expressions = [...value.expressions];
    expressions.splice(index, 1, expression);
    onChange({
      ...value,
      expressions,
    });
  };

  onRemoveValue = (index: number) => {
    const { value, onChange } = this.props;

    const expressions = [...value.expressions];
    expressions.splice(index, 1);

    onChange({
      ...value,
      expressions,
    });
  };

  render() {
    const { value } = this.props;
    const { expressions } = value;
    const styles = getStyles();

    if (!expressions || !expressions.length) {
      return (
        <div className={styles.container}>
          <AddButton index={0} onChange={this.onChangeValue} typeToAdd={value.typeToRepeat} />
        </div>
      );
    }

    return (
      <div>
        {expressions.map((value, index) => {
          const onChange = (exp: QueryEditorExpression | undefined) => this.onChangeValue(exp, index);
          const containerStyles = !isFirstRow(index, expressions.length)
            ? styles.containerWithSpacing
            : styles.container;

          return (
            <div className={containerStyles} key={`rptr-${index}-${asKey(value)}`}>
              {this.props.children({ value, onChange })}
              <RemoveButton index={index} onRemove={this.onRemoveValue} />
              {index !== 0 ? null : (
                <AddButton
                  index={expressions.length}
                  onChange={this.onChangeValue}
                  typeToAdd={this.props.value.typeToRepeat}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }
}

function asKey(value: QueryEditorExpression): string {
  return JSON.stringify(value);
}

export const isRepeater = (expression: QueryEditorExpression): expression is QueryEditorRepeaterExpression => {
  return (expression as QueryEditorRepeaterExpression)?.type === QueryEditorExpressionType.OperatorRepeater;
};

const isFirstRow = (index: number, length: number): boolean => {
  return index + 1 === length;
};

interface AddQueryEditorProps {
  index: number;
  onChange: (expression: QueryEditorExpression | undefined, index: number) => void;
  typeToAdd: QueryEditorExpressionType;
}

const AddButton: React.FC<AddQueryEditorProps> = props => {
  const styles = getStyles();
  const onAddEditor = useCallback(() => props.onChange({ type: props.typeToAdd }, props.index), [props]);
  return <Button className={styles.addButton} variant="secondary" onClick={onAddEditor} icon="plus" />;
};

interface RemoveQueryEditorProps {
  index: number;
  onRemove: (index: number) => void;
}

const RemoveButton: React.FC<RemoveQueryEditorProps> = props => {
  const styles = getStyles();
  const onRemoveEditor = useCallback(() => props.onRemove(props.index), [props]);
  return <Button className={styles.removeButton} variant="secondary" onClick={onRemoveEditor} icon="minus" />;
};

const getStyles = stylesFactory(() => {
  const container = css`
    display: flex;
    flex-direction: row;
  `;

  return {
    container: container,
    removeButton: css`
      margin-right: 4px;
      margin-left: 4px;
    `,
    addButton: css`
      margin-right: 4px;
    `,
    containerWithSpacing: css`
      ${container}
      margin-bottom: 4px;
    `,
  };
});
