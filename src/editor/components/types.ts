import { SelectableValue } from '@grafana/data';
import { QueryEditorExpression } from '../expressions';

export type ExpressionSuggestor = (txt: string, skip: QueryEditorExpression) => Promise<Array<SelectableValue<string>>>;
