import { QueryEditorPropertyType, QueryEditorProperty, QueryEditorOperator } from '../schema/types';

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
  focus?: boolean;
}

export interface QueryEditorReduceExpressionArray extends QueryEditorExpression {
  expressions: QueryEditorReduceExpression[];
}

export interface QueryEditorGroupByExpression extends QueryEditorExpression {
  property: QueryEditorProperty;
  interval?: QueryEditorProperty;
  focus?: boolean;
}

export interface QueryEditorGroupByExpressionArray extends QueryEditorExpression {
  expressions: QueryEditorGroupByExpression[];
}

export interface QueryEditorColumnsExpression extends QueryEditorExpression {
  columns?: string[];
}

export interface QueryEditorWhereExpression extends QueryEditorExpression {
  expressions: QueryEditorOperatorExpression[];
}

export interface QueryEditorWhereArrayExpression extends QueryEditorExpression {
  expressions: Array<QueryEditorOperatorExpression | QueryEditorWhereExpression>;
}

export interface QueryEditorArrayExpression extends QueryEditorExpression {
  expressions: QueryEditorExpression[] | QueryEditorArrayExpression[];
}
