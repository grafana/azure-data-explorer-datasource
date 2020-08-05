import {
  QueryEditorReduceExpression,
  QueryEditorFieldExpression,
  QueryEditorFunctionParameterExpression,
  QueryEditorFieldAndOperatorExpression,
  QueryEditorGroupByExpression,
  QueryEditorOperatorExpression,
  QueryEditorBoolOperatorExpression,
  QueryEditorMultiOperatorExpression,
  QueryEditorSingleOperatorExpression,
  QueryEditorRepeaterExpression,
} from './expressions';
import { QueryEditorExpression, QueryEditorExpressionType } from '../types';
import { QueryEditorFieldType } from './types';

export const isReduceExpression = (expression: QueryEditorExpression): expression is QueryEditorReduceExpression => {
  return (expression as QueryEditorReduceExpression)?.type === QueryEditorExpressionType.Reduce;
};

export const isFieldExpression = (expression: QueryEditorExpression): expression is QueryEditorFieldExpression => {
  return (expression as QueryEditorFieldExpression)?.type === QueryEditorExpressionType.Field;
};

export const isFunctionParameterExpression = (
  expression: QueryEditorExpression | undefined
): expression is QueryEditorFunctionParameterExpression => {
  return (expression as QueryEditorFunctionParameterExpression)?.type === QueryEditorExpressionType.FunctionParameter;
};

export const isFieldAndOperator = (
  expression: QueryEditorExpression
): expression is QueryEditorFieldAndOperatorExpression => {
  return (expression as QueryEditorFieldAndOperatorExpression)?.type === QueryEditorExpressionType.FieldAndOperator;
};

export const isGroupBy = (expression: QueryEditorExpression): expression is QueryEditorGroupByExpression => {
  return (expression as QueryEditorGroupByExpression)?.type === QueryEditorExpressionType.GroupBy;
};

export const isDateGroupBy = (expression: QueryEditorExpression): boolean => {
  return (expression as QueryEditorGroupByExpression)?.field?.fieldType === QueryEditorFieldType.DateTime;
};

export const isBoolOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorBoolOperatorExpression => {
  return typeof (expression as QueryEditorBoolOperatorExpression)?.value === 'boolean';
};

export const isMultiOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorMultiOperatorExpression => {
  return Array.isArray((expression as QueryEditorMultiOperatorExpression)?.values);
};

export const isOperator = (expression: QueryEditorExpression): expression is QueryEditorOperatorExpression => {
  return (expression as QueryEditorOperatorExpression)?.type === QueryEditorExpressionType.Operator;
};

export const isSingleOperator = (
  expression: QueryEditorOperatorExpression | undefined
): expression is QueryEditorSingleOperatorExpression => {
  return typeof (expression as QueryEditorSingleOperatorExpression)?.value === 'string';
};

export const isRepeater = (expression: QueryEditorExpression): expression is QueryEditorRepeaterExpression => {
  return (expression as QueryEditorRepeaterExpression)?.type === QueryEditorExpressionType.OperatorRepeater;
};
