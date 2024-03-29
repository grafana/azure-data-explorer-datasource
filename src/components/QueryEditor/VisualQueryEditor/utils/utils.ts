import { SelectableValue, toOption } from '@grafana/data';
import {
  QueryEditorArrayExpression,
  QueryEditorColumnsExpression,
  QueryEditorExpressionType,
  QueryEditorGroupByExpression,
  QueryEditorOperatorExpression,
  QueryEditorReduceExpression,
} from 'types/expressions';
import { intersection, isUndefined, uniq } from 'lodash';
import { toPropertyType } from 'schema/mapper';
import { QueryEditorOperatorValueType, QueryEditorPropertyType } from 'schema/types';
import { AdxColumnSchema, QueryExpression } from 'types';
import { AggregateFunctions } from '../AggregateItem';
import { FilterExpression } from '../KQLFilter';
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
  expression: Partial<FilterExpression>,
  name: string,
  type: QueryEditorPropertyType
): FilterExpression {
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
    index: Number(expression.index),
  };
}

/** Sets the operator ("==") in an OperatorExpression
 * Accepts a partial expression to use in an editor
 */
export function setOperatorExpressionName(expression: Partial<FilterExpression>, name: string): FilterExpression {
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
    index: Number(expression.index),
  };
}

/** Sets the right hand side ("i-abc123445") in an OperatorExpression
 * Accepts a partial expression to use in an editor
 */
export function setOperatorExpressionValue(
  expression: Partial<FilterExpression>,
  e: SelectableValue<string> | Array<SelectableValue<string>> | number | string
): FilterExpression {
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
    index: Number(expression.index),
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

// extract the column name, ignoring inner objects for dynamic columns
// e.g. MyCol["Inner"] => MyCol
export function toColumnName(column: AdxColumnSchema) {
  return column.Name.split('[')[0];
}

export function toColumnNames(columns: AdxColumnSchema[]) {
  return uniq(columns.map((c) => toColumnName(c)));
}

// return columns defined in the expression (if any)
export function filterColumns(
  tableSchema?: AdxColumnSchema[],
  expression?: QueryEditorColumnsExpression
): AdxColumnSchema[] | undefined {
  return expression?.columns?.length
    ? // filter columns with the same name or under the same dynamic column
      // e.g. MyCol or MyCol["Inner"]
      tableSchema?.filter((c) => expression?.columns?.includes(toColumnName(c)))
    : tableSchema;
}

// return columns in use by an expression. If none has been specified, return the first
// time and number columns from the table definition
export function defaultTimeSeriesColumns(expression: QueryExpression, tableColumns: AdxColumnSchema[]): string[] {
  const res: string[] = [];
  if (expression.where.expressions?.length) {
    (expression.where.expressions as QueryEditorArrayExpression[]).forEach((exp) => {
      if (exp.expressions.length) {
        (exp.expressions as QueryEditorOperatorExpression[]).forEach((e) => {
          if (!res.includes(e.property.name)) {
            res.push(e.property.name);
          }
        });
      }
    });
  }
  if (expression.reduce.expressions?.length) {
    expression.reduce.expressions.forEach((exp) => {
      if (!res.includes(exp.property.name)) {
        res.push(exp.property.name);
      }
    });
  }
  if (expression.groupBy.expressions?.length) {
    expression.groupBy.expressions.forEach((exp) => {
      if (!res.includes(exp.property.name)) {
        res.push(exp.property.name);
      }
    });
  }

  const timeCols = tableColumns.reduce<string[]>((cols, col) => {
    if (toPropertyType(col.CslType) === QueryEditorPropertyType.DateTime) {
      cols.push(col.Name);
    }
    return cols;
  }, []);
  if (timeCols.length && intersection(res, timeCols).length === 0) {
    // No time column in use, add the first one
    res.push(timeCols[0]);
  }

  const valCols = tableColumns.reduce<string[]>((cols, col) => {
    if (toPropertyType(col.CslType) === QueryEditorPropertyType.Number) {
      cols.push(col.Name);
    }
    return cols;
  }, []);
  if (valCols.length && intersection(res, valCols).length === 0) {
    // No value column in use, add the first one
    res.push(valCols[0]);
  }

  return res;
}

export const createOperator = (property: string, operator: string, value: any): QueryEditorOperatorExpression => {
  return {
    type: QueryEditorExpressionType.Operator,
    property: {
      name: property,
      type: valueToPropertyType(value),
    },
    operator: {
      name: operator,
      value: value,
    },
  };
};

export const valueToPropertyType = (value: any): QueryEditorPropertyType => {
  if (Array.isArray(value) && value.length > 0) {
    return valueToPropertyType(value[0]);
  }

  switch (typeof value) {
    case 'number':
      return QueryEditorPropertyType.Number;
    case 'boolean':
      return QueryEditorPropertyType.Boolean;
    default:
      return QueryEditorPropertyType.String;
  }
};
