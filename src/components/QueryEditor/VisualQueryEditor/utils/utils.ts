import { SelectableValue, toOption } from '@grafana/data';
import {
  QueryEditorExpressionType,
  QueryEditorOperatorExpression,
} from 'components/LegacyQueryEditor/editor/expressions';
import { isUndefined } from 'lodash';
import { QueryEditorOperatorValueType, QueryEditorPropertyType } from 'schema/types';
import { isMulti, OPERATORS } from './operators';

/** Sets the left hand side (InstanceId) in an OperatorExpression
 * Accepts a partial expression to use in an editor
 */
export function setOperatorExpressionProperty(
  expression: Partial<QueryEditorOperatorExpression>,
  name: string,
  type: QueryEditorPropertyType
): QueryEditorOperatorExpression {
  let operatorName = '==';
  if (expression.operator?.name && OPERATORS[type].map((op) => op.Operator).includes(expression.operator.name)) {
    operatorName = expression.operator.name;
  }
  return {
    type: QueryEditorExpressionType.Operator,
    property: { name, type },
    operator: { name: operatorName, value: '' },
  };
}

/** Sets the operator ("==") in an OperatorExpression
 * Accepts a partial expression to use in an editor
 */
export function setOperatorExpressionName(
  expression: Partial<QueryEditorOperatorExpression>,
  name: string
): QueryEditorOperatorExpression {
  let opValue = expression.operator?.value ?? '';
  if (isMulti(name) && !Array.isArray(opValue)) {
    // Handle the case in which the operator now points to an multi value
    opValue = expression.operator?.value ? [expression.operator.value] : [];
  } else if (!isMulti(name) && Array.isArray(opValue)) {
    // Handle the case in which the operator now points to a single value
    opValue = opValue.length ? opValue[0] : '';
  }
  return {
    type: QueryEditorExpressionType.Operator,
    property: expression.property ?? {
      type: QueryEditorPropertyType.String,
      name: '',
    },
    operator: {
      ...expression.operator,
      name,
      value: opValue,
    },
  };
}

/** Sets the right hand side ("i-abc123445") in an OperatorExpression
 * Accepts a partial expression to use in an editor
 */
export function setOperatorExpressionValue(
  expression: Partial<QueryEditorOperatorExpression>,
  e: SelectableValue<string> | Array<SelectableValue<string>> | number
): QueryEditorOperatorExpression {
  let value: string | string[] | number;
  if (typeof e === 'object' && !Array.isArray(e)) {
    value = e.value || '';
  } else if (Array.isArray(e)) {
    value = e.map((s) => s.value || '');
  } else {
    value = e;
  }

  return {
    type: QueryEditorExpressionType.Operator,
    property: expression.property ?? {
      type: QueryEditorPropertyType.String,
      name: '',
    },
    operator: {
      ...expression.operator,
      name: expression.operator?.name ?? '==',
      value,
    },
  };
}

export function getOperatorExpressionValue(value?: QueryEditorOperatorValueType) {
  return value
    ? Array.isArray(value)
      ? value
      : // Remove quotes if they exist (template variable case)
        toOption(value.toString().replace(/'/g, ''))
    : null;
}

export function getOperatorExpressionOptions(
  value?: Array<SelectableValue<string>>,
  current?: QueryEditorOperatorValueType
) {
  const defaultOptions: Array<SelectableValue<string>> = current
    ? Array.isArray(current)
      ? current.map((v) => ({ label: v.toString(), value: v.toString() }))
      : [{ label: current.toString(), value: current.toString() }]
    : [];

  return value || defaultOptions;
}

/** Given a partial operator expression, return a non-partial if it's valid, or undefined */
export function sanitizeOperator(
  expression: Partial<QueryEditorOperatorExpression>
): QueryEditorOperatorExpression | undefined {
  const key = expression.property?.name;
  const value = expression.operator?.value;
  const operator = expression.operator?.name;

  if (key && !isUndefined(value) && operator) {
    return {
      type: QueryEditorExpressionType.Operator,
      property: {
        type: expression.property?.type ?? QueryEditorPropertyType.String,
        name: key,
      },
      operator: {
        value,
        name: operator,
      },
    };
  }

  return undefined;
}
