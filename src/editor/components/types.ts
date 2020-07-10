import { QueryEditorOperatorDefinition } from 'editor/types';

export enum QueryEditorExpressionType {
  Field = 'field',
  Conditional = 'conditional',
  Operator = 'operator',
  FieldAndOperator = 'fieldAndOperator',
  OperatorRepeater = 'operatorRepeater',
  Reduce = 'reduce',
}

export interface QueryEditorExpression {
  type: QueryEditorExpressionType;
}

export interface QueryEditorOperatorExpression extends QueryEditorExpression {
  operator: QueryEditorOperatorDefinition;
}
