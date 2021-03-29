import { QueryEditorPropertyType, QueryEditorProperty, QueryEditorOperator } from './types';

export enum QueryEditorExpressionType {
  Property = 'property',
  Operator = 'operator',
  Reduce = 'reduce',
  FunctionParameter = 'functionParameter',
  GroupBy = 'groupBy',
  Or = 'or',
  And = 'and',
}
export interface QueryEditorExpression {
  type: QueryEditorExpressionType;
}

export interface QueryEditorPropertyExpression extends QueryEditorExpression {
  property: QueryEditorProperty;
}
export interface QueryEditorOperatorExpression extends QueryEditorExpression {
  property: QueryEditorProperty;
  operator: QueryEditorOperator;
}

export interface QueryEditorFunctionParameterExpression extends QueryEditorExpression {
  value: string;
  fieldType: QueryEditorPropertyType;
  name: string;
}

export interface QueryEditorReduceExpression extends QueryEditorExpression {
  property: QueryEditorProperty;
  reduce: QueryEditorProperty;
  parameters?: QueryEditorFunctionParameterExpression[];
}

export interface QueryEditorGroupByExpression extends QueryEditorExpression {
  property: QueryEditorProperty;
  interval?: QueryEditorProperty;
}

export interface QueryEditorArrayExpression extends QueryEditorExpression {
  expressions: QueryEditorExpression[] | QueryEditorArrayExpression[];
}
