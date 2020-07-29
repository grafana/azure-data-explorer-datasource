import { QueryEditorOperatorDefinition } from 'editor/types';
import { QueryEditorExpression } from '../../types';
import { SelectableValue } from '@grafana/data';

export interface QueryEditorOperatorExpression extends QueryEditorExpression {
  operator: QueryEditorOperatorDefinition;
}

export type ExpressionSuggestor = (txt: string, skip: QueryEditorExpression) => Promise<Array<SelectableValue<string>>>;
