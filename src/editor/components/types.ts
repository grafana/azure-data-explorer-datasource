import { QueryEditorExpression } from '../../types';
import { SelectableValue } from '@grafana/data';

export type ExpressionSuggestor = (txt: string, skip: QueryEditorExpression) => Promise<Array<SelectableValue<string>>>;
