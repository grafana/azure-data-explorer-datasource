import { SelectableValue } from '@grafana/data';
import { QueryEditorProperty } from 'editor/types';

export type ExpressionSuggestor = (txt: string) => Promise<Array<SelectableValue<string>>>;
export type SkippableExpressionSuggestor = (
  txt: string,
  skip?: QueryEditorProperty
) => Promise<Array<SelectableValue<string>>>;
