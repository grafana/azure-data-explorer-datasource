import { QueryEditorOperatorDefinition } from 'editor/types';

export enum QueryEditorExpressionType {
  Field = 'value',
  Conditional = 'conditional',
  Operator = 'operator',
}

export interface QueryEditorExpression {
  id: string;
  type: QueryEditorExpressionType;
}

export interface QueryEditorOperatorExpression extends QueryEditorExpression {
  operator: QueryEditorOperatorDefinition;
}
