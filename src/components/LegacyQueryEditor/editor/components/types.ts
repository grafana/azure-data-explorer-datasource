import { SelectableValue } from '@grafana/data';
import { QueryEditorOperatorExpression } from 'components/LegacyQueryEditor/editor/expressions';

export type ExpressionSuggestor = (txt: string) => Promise<Array<SelectableValue<string>>>;
export type SkippableExpressionSuggestor = (
  search: QueryEditorOperatorExpression
) => Promise<Array<SelectableValue<string>>>;

export type SearchExpressionSuggestor = (
  index: string,
  search: QueryEditorOperatorExpression
) => Promise<Array<SelectableValue<string>>>;
