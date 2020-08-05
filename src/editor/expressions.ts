import { QueryEditorFieldType, QueryEditorOperatorDefinition } from './types';

export enum QueryEditorExpressionType {
  Field = 'field',
  Conditional = 'conditional',
  Operator = 'operator',
  FieldAndOperator = 'fieldAndOperator',
  OperatorRepeater = 'operatorRepeater',
  Reduce = 'reduce',
  FunctionParameter = 'functionParameter',
  GroupBy = 'groupBy',
}

export interface QueryEditorExpression {
  type: QueryEditorExpressionType;
}

export interface QueryEditorSectionExpression {
  id: string;
  expression?: QueryEditorExpression;
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
export interface QueryEditorFieldExpression extends QueryEditorExpression {
  value: string;
  fieldType: QueryEditorFieldType;
}
export interface QueryEditorFieldAndOperatorExpression extends QueryEditorExpression {
  field: QueryEditorFieldExpression;
  operator: QueryEditorOperatorExpression;
}

export interface QueryEditorFunctionParameterExpression extends QueryEditorExpression {
  value: string;
  fieldType: QueryEditorFieldType;
  name: string;
}

export interface QueryEditorReduceExpression extends QueryEditorExpression {
  field: QueryEditorFieldExpression;
  reduce: QueryEditorFieldExpression;
  parameters?: QueryEditorFunctionParameterExpression[];
}

export interface QueryEditorGroupByExpression extends QueryEditorExpression {
  field: QueryEditorFieldExpression;
  interval?: QueryEditorFieldExpression;
}

export interface QueryEditorRepeaterExpression extends QueryEditorExpression {
  typeToRepeat: QueryEditorExpressionType;
  expressions: QueryEditorExpression[];
}
