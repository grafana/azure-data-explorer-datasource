import { QueryEditorExpression, QueryEditorExpressionType } from '../types';
import { QueryEditorFieldType, QueryEditorOperatorDefinition } from './types';

export interface QueryEditorBoolOperatorExpression extends QueryEditorOperatorExpression {
  value: boolean;
}

export interface QueryEditorMultiOperatorExpression extends QueryEditorOperatorExpression {
  values: string[];
}

export interface QueryEditorSingleOperatorExpression extends QueryEditorOperatorExpression {
  value: string;
}

export interface QueryEditorFieldExpression extends QueryEditorExpression {
  value: string;
  fieldType: QueryEditorFieldType;
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

export interface QueryEditorOperatorExpression extends QueryEditorExpression {
  operator: QueryEditorOperatorDefinition;
}

export interface QueryEditorFieldAndOperatorExpression extends QueryEditorExpression {
  field: QueryEditorFieldExpression;
  operator: QueryEditorOperatorExpression;
}

export interface QueryEditorRepeaterExpression extends QueryEditorExpression {
  typeToRepeat: QueryEditorExpressionType;
  expressions: QueryEditorExpression[];
}
