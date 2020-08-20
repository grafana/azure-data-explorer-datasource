import { SelectableValue } from '@grafana/data';

export type ExpressionSuggestor = (txt: string) => Promise<Array<SelectableValue<string>>>;
export type SkippableExpressionSuggestor = (txt: string, column?: string) => Promise<Array<SelectableValue<string>>>;
