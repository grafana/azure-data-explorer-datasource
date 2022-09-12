import { SelectableValue, toOption } from '@grafana/data';
import {
  QueryEditorExpressionType,
  QueryEditorGroupByExpression,
  QueryEditorOperatorExpression,
  QueryEditorReduceExpression,
} from 'components/LegacyQueryEditor/editor/expressions';
import { isUndefined } from 'lodash';
import { QueryEditorOperatorValueType, QueryEditorPropertyType } from 'schema/types';
import { AggregateFunctions } from '../AggregateItem';
import { isMulti, OPERATORS } from './operators';

function zeroValue(type: QueryEditorPropertyType) {
  switch (type) {
    case QueryEditorPropertyType.String:
      return '';
    case QueryEditorPropertyType.Boolean:
      return false;
    default:
      return 0;
  }
}

/** Sets the left hand side (InstanceId) in an OperatorExpression
 * Accepts a partial expression to use in an editor
 */
export function setOperatorExpressionProperty(
  expression: Partial<QueryEditorOperatorExpression>,
  name: string,
  type: QueryEditorPropertyType
): QueryEditorOperatorExpression {
  let operatorName = '==';
  if (
    expression.operator?.name &&
    OPERATORS(type)
      .map((op) => op.Operator)
      .includes(expression.operator.name)
  ) {
    operatorName = expression.operator.name;
  }
  return {
    type: QueryEditorExpressionType.Operator,
    property: { name, type },
    operator: { name: operatorName, value: zeroValue(type) },
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
  e: SelectableValue<string> | Array<SelectableValue<string>> | number | string
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

/** Given a partial aggregation expression, return a non-partial if it's valid, or undefined */
export function sanitizeAggregate(expression: QueryEditorReduceExpression): QueryEditorReduceExpression | undefined {
  const func = expression.reduce?.name;
  const column = expression.property?.name;

  if (func) {
    switch (func) {
      case AggregateFunctions.Count:
        // Count function does not require a column
        return expression;
      case AggregateFunctions.Percentile:
        // Percentile requires a column and a parameter
        if (column && expression.parameters?.length) {
          return expression;
        }
        break;
      default:
        // All the other functions require a column
        if (column) {
          return expression;
        }
    }
  }

  return undefined;
}

/** Given a partial aggregation expression, return a non-partial if it's valid, or undefined */
export function sanitizeGroupBy(expression: QueryEditorGroupByExpression): QueryEditorGroupByExpression | undefined {
  const column = expression.property?.name;
  const type = expression.property?.type;

  if (column) {
    if (
      type !== QueryEditorPropertyType.DateTime ||
      // DateTime columns require an interval
      (type === QueryEditorPropertyType.DateTime && expression.interval?.name)
    ) {
      return expression;
    }
  }

  return undefined;
}
