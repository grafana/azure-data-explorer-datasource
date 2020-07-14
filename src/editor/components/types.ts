import { QueryEditorOperatorDefinition } from 'editor/types';
import { QueryEditorExpression } from '../../types';

export interface QueryEditorOperatorExpression extends QueryEditorExpression {
  operator: QueryEditorOperatorDefinition;
}
