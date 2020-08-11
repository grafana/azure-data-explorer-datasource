import { QueryEditorPropertyType, QueryEditorOperatorDefinition, QueryEditorProperty } from './types';

export enum QueryEditorExpressionType {
  Field = 'field',
  Conditional = 'conditional',
  Operator = 'operator',
  FieldAndOperator = 'fieldAndOperator',
  OperatorRepeater = 'operatorRepeater',
  Reduce = 'reduce',
  FunctionParameter = 'functionParameter',
  GroupBy = 'groupBy',
  Or = 'or',
  And = 'and',
}
export interface QueryEditorExpression {
  type: QueryEditorExpressionType;
}

/** OPERATORS */
export interface QueryEditorOperatorExpression extends QueryEditorExpression {
  operator: QueryEditorOperatorDefinition;
}
export interface QueryEditorBoolOperatorExpression extends QueryEditorOperatorExpression {
  value: boolean;
}

export interface QueryEditorMultiOperatorExpression extends QueryEditorOperatorExpression {
  values: string[];
}

export interface QueryEditorSingleOperatorExpression extends QueryEditorOperatorExpression {
  value: string;
}

/** COMBINED */
export interface QueryEditorPropertyExpression extends QueryEditorExpression {
  property: QueryEditorProperty;
}
export interface QueryEditorFieldAndOperatorExpression extends QueryEditorExpression {
  property: QueryEditorProperty;
  operator: QueryEditorOperatorExpression;
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

export interface QueryEditorRepeaterExpression extends QueryEditorExpression {
  typeToRepeat: QueryEditorExpressionType;
  expressions: QueryEditorExpression[];
}

export interface QueryEditorArrayExpression extends QueryEditorExpression {
  expressions: QueryEditorExpression[];
}
