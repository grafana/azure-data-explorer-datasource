import {
  QueryEditorReduceExpression,
  QueryEditorPropertyExpression,
  QueryEditorFunctionParameterExpression,
  QueryEditorOperatorExpression,
  QueryEditorGroupByExpression,
  QueryEditorExpression,
  QueryEditorExpressionType,
  QueryEditorArrayExpression,
} from './expressions';
import { QueryEditorPropertyType, QueryEditorOperator } from './types';

export const isReduceExpression = (expression?: QueryEditorExpression): expression is QueryEditorReduceExpression => {
  return expression?.type === QueryEditorExpressionType.Reduce;
};

export const isFieldExpression = (expression: QueryEditorExpression): expression is QueryEditorPropertyExpression => {
  return expression?.type === QueryEditorExpressionType.Property;
};

export const isFunctionParameterExpression = (
  expression?: QueryEditorExpression
): expression is QueryEditorFunctionParameterExpression => {
  return (expression as QueryEditorFunctionParameterExpression)?.type === QueryEditorExpressionType.FunctionParameter;
};

export const isFieldAndOperator = (expression?: QueryEditorExpression): expression is QueryEditorOperatorExpression => {
  return expression?.type === QueryEditorExpressionType.Operator;
};

export const isGroupBy = (expression?: QueryEditorExpression): expression is QueryEditorGroupByExpression => {
  return expression?.type === QueryEditorExpressionType.GroupBy;
};

export const isDateGroupBy = (expression: QueryEditorExpression): boolean => {
  return (expression as QueryEditorGroupByExpression)?.property?.type === QueryEditorPropertyType.DateTime;
};

export const isBoolOperator = (operator: QueryEditorOperator | undefined): operator is QueryEditorOperator<boolean> => {
  return typeof operator?.value === 'boolean';
};

export const isMultiOperator = (operator?: QueryEditorOperator): operator is QueryEditorOperator<string[]> => {
  return Array.isArray(operator?.value);
};

export const isSingleOperator = (operator?: QueryEditorOperator): operator is QueryEditorOperator<string> => {
  return !isMultiOperator(operator);
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
