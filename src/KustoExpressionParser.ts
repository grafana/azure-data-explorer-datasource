import { QueryEditorSectionExpression } from 'editor/components/QueryEditorSection';
import { isField } from 'editor/components/field/QueryEditorField';

export class KustoExpressionParser {
  fromTable(section?: QueryEditorSectionExpression): string {
    if (section && section.expression && isField(section.expression)) {
      return section.expression.value;
    }
    return '';
  }
}
