import { QueryExpression, defaultQuery } from 'types';
import {
  QueryEditorExpressionType,
  QueryEditorOperatorExpression,
  QueryEditorPropertyExpression,
  QueryEditorReduceExpression,
  QueryEditorGroupByExpression,
  QueryEditorReduceExpressionArray,
} from 'types/expressions';
import { QueryEditorPropertyType, QueryEditorProperty } from '../schema/types';

export const migrateExpression = (version: string | undefined, expression: any): QueryExpression => {
  if (looksLikeV2(expression)) {
    return migrateV2ToV3(expression);
  }
  return expression ?? defaultQuery.expression;
};

export const looksLikeV2 = (expression: any): boolean => {
  return typeof expression?.from?.expression?.value === 'string';
};

const migrateV2ToV3 = (expression: any): QueryExpression => {
  if (!expression) {
    return defaultQuery.expression;
  }

  const migrated: QueryExpression = {
    ...defaultQuery.expression,
  };

  if (typeof expression?.from?.expression?.value === 'string') {
    migrated.from = migrateV2PropertyExpression(expression?.from?.expression);
  }

  if (Array.isArray(expression?.where?.expression?.expressions)) {
    migrated.where = {
      type: QueryEditorExpressionType.And,
      expressions: expression?.where?.expression?.expressions
        .map(migrateV2Expression)
        .filter((exp) => !!exp)
        .map((exp) => {
          return {
            type: QueryEditorExpressionType.Or,
            expressions: [exp],
          };
        }),
    };
  }

  if (Array.isArray(expression?.reduce?.expression?.expressions)) {
    migrated.reduce = migrateV2Array(expression?.reduce?.expression?.expressions);
  }

  if (Array.isArray(expression?.groupBy?.expression?.expressions)) {
    migrated.groupBy = migrateV2Array(expression?.groupBy?.expression?.expressions);
  }

  return migrated;
};

const migrateV2Array = (expressions: any[]): QueryEditorReduceExpressionArray => {
  if (!Array.isArray(expressions)) {
    return {
      type: QueryEditorExpressionType.And,
      expressions: [],
    };
  }

  return {
    type: QueryEditorExpressionType.And,
    expressions: expressions.map(migrateV2Expression).filter((exp) => !!exp) as QueryEditorReduceExpression[],
  };
};

const migrateV2Expression = (
  expression: any
): QueryEditorOperatorExpression | QueryEditorPropertyExpression | undefined => {
  switch (expression?.type) {
    case 'fieldAndOperator':
      return migrateV2OperatorExpression(expression);
    case 'field':
      return migrateV2PropertyExpression(expression);
    case 'reduce':
      return migrateV2ReduceExpression(expression);
    case 'groupBy':
      return migrateV2GroupByExpression(expression);
    default:
      return;
  }
};

const migrateV2GroupByExpression = (expression: any): QueryEditorGroupByExpression | undefined => {
  if (expression?.type !== 'groupBy') {
    return;
  }

  if (typeof expression?.field !== 'object') {
    return;
  }

  if (typeof expression?.interval !== 'object') {
    return {
      type: QueryEditorExpressionType.GroupBy,
      property: migrateV2Property(expression?.field),
    };
  }

  return {
    type: QueryEditorExpressionType.GroupBy,
    property: migrateV2Property(expression?.field),
    interval: migrateV2Property(expression?.interval),
  };
};

const migrateV2ReduceExpression = (expression: any): QueryEditorReduceExpression | undefined => {
  if (expression?.type !== 'reduce') {
    return;
  }

  if (typeof expression?.field !== 'object') {
    return;
  }

  if (Array.isArray(expression?.parameters)) {
    return {
      type: QueryEditorExpressionType.Reduce,
      property: migrateV2Property(expression?.field),
      reduce: migrateV2Property(expression?.reduce),
      parameters: expression.parameters,
    };
  }

  return {
    type: QueryEditorExpressionType.Reduce,
    property: migrateV2Property(expression?.field),
    reduce: migrateV2Property(expression?.reduce),
  };
};

const migrateV2PropertyExpression = (expression: any): QueryEditorPropertyExpression | undefined => {
  if (expression?.type !== 'field') {
    return;
  }

  if (typeof expression?.value !== 'string') {
    return;
  }

  return {
    type: QueryEditorExpressionType.Property,
    property: migrateV2Property(expression),
  };
};

const migrateV2OperatorExpression = (expression: any): QueryEditorOperatorExpression | undefined => {
  if (typeof expression?.field?.value !== 'string') {
    return;
  }

  if (typeof expression?.operator?.operator?.value !== 'string') {
    return;
  }

  return {
    type: QueryEditorExpressionType.Operator,
    property: migrateV2Property(expression?.field),
    operator: {
      name: expression?.operator?.operator?.value,
      value: expression?.operator?.value ?? expression?.operator?.values,
    },
  };
};

const migrateV2Property = (property: any): QueryEditorProperty => {
  return {
    type: migrateV2PropertyType(property.fieldType),
    name: property.value,
  };
};

const migrateV2PropertyType = (type: any): QueryEditorPropertyType => {
  switch (type) {
    case 'boolean':
      return QueryEditorPropertyType.Boolean;
    case 'dateTime':
      return QueryEditorPropertyType.DateTime;
    case 'function':
      return QueryEditorPropertyType.Function;
    case 'number':
      return QueryEditorPropertyType.Number;
    case 'interval':
      return QueryEditorPropertyType.Interval;
    default:
      return QueryEditorPropertyType.String;
  }
};
