import {
  QueryEditorReduceExpression,
  QueryEditorPropertyExpression,
  QueryEditorFunctionParameterExpression,
  QueryEditorFieldAndOperatorExpression,
  QueryEditorGroupByExpression,
  QueryEditorOperatorExpression,
  QueryEditorRepeaterExpression,
  QueryEditorExpression,
  QueryEditorExpressionType,
  QueryEditorArrayExpression,
} from './expressions';
import { QueryEditorPropertyType, QueryEditorOperator } from './types';

export const isReduceExpression = (expression: QueryEditorExpression): expression is QueryEditorReduceExpression => {
  return (expression as QueryEditorReduceExpression)?.type === QueryEditorExpressionType.Reduce;
};

export const isFieldExpression = (expression: QueryEditorExpression): expression is QueryEditorPropertyExpression => {
  return expression?.type === QueryEditorExpressionType.Field;
};

export const isFunctionParameterExpression = (
  expression: QueryEditorExpression | undefined
): expression is QueryEditorFunctionParameterExpression => {
  return (expression as QueryEditorFunctionParameterExpression)?.type === QueryEditorExpressionType.FunctionParameter;
};

export const isFieldAndOperator = (
  expression: QueryEditorExpression | undefined
): expression is QueryEditorFieldAndOperatorExpression => {
  return expression?.type === QueryEditorExpressionType.FieldAndOperator;
};

export const isGroupBy = (expression: QueryEditorExpression): expression is QueryEditorGroupByExpression => {
  return (expression as QueryEditorGroupByExpression)?.type === QueryEditorExpressionType.GroupBy;
};

export const isDateGroupBy = (expression: QueryEditorExpression): boolean => {
  return (expression as QueryEditorGroupByExpression)?.property?.type === QueryEditorPropertyType.DateTime;
};

export const isBoolOperator = (operator: QueryEditorOperator | undefined): operator is QueryEditorOperator<boolean> => {
  return typeof operator?.value === 'boolean';
};

export const isMultiOperator = (operator: QueryEditorOperator | undefined): operator is QueryEditorOperator<any[]> => {
  return Array.isArray(operator?.value);
};

export const isOperator = (expression: QueryEditorExpression): expression is QueryEditorOperatorExpression => {
  return (expression as QueryEditorOperatorExpression)?.type === QueryEditorExpressionType.Operator;
};

export const isSingleOperator = (operator: QueryEditorOperator | undefined): operator is QueryEditorOperator<any> => {
  return !isMultiOperator(operator);
};

export const isRepeater = (expression: QueryEditorExpression): expression is QueryEditorRepeaterExpression => {
  return (expression as QueryEditorRepeaterExpression)?.type === QueryEditorExpressionType.OperatorRepeater;
};

export const isAndExpression = (expression?: QueryEditorExpression): expression is QueryEditorArrayExpression => {
  return expression?.type === QueryEditorExpressionType.And;
};

export const isOrExpression = (expression?: QueryEditorExpression): expression is QueryEditorArrayExpression => {
  return expression?.type === QueryEditorExpressionType.Or;
};

export const isArrayExpression = (expression?: QueryEditorExpression): expression is QueryEditorArrayExpression => {
  return isAndExpression(expression) || isOrExpression(expression);
};
