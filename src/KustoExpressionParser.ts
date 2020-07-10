import { QueryEditorSectionExpression } from 'editor/components/QueryEditorSection';
import { isField } from 'editor/components/field/QueryEditorField';
import { isRepeater } from 'editor/components/QueryEditorRepeater';
import { QueryEditorExpression } from 'editor/components/types';
import { isFieldAndOperator } from 'editor/components/filter/QueryEditorFieldAndOperator';
import { isMultiOperator } from 'editor/components/operators/QueryEditorMultiOperator';

interface QuerySections {
  from?: QueryEditorSectionExpression;
  where?: QueryEditorSectionExpression;
  reduce?: QueryEditorSectionExpression;
}
export class KustoExpressionParser {
  fromTable(section?: QueryEditorSectionExpression): string {
    if (section && section.expression && isField(section.expression)) {
      return section.expression.value;
    }
    return '';
  }

  // we need to write tests for thise one but I would like to have one expression tree
  // that is the entry before doing that.
  query(sections: QuerySections): string {
    const { from, where, reduce } = sections;
    const table = this.fromTable(from);

    if (!table) {
      return '';
    }

    const parts: string[] = [table, 'where $__timeFilter(StartTime)'];

    if (!where || !where.expression) {
      return parts.join('\n| ');
    }

    this.appendWhere(where.expression, parts);
    return parts.join('\n| ');
  }

  private appendWhere(expression: QueryEditorExpression, parts: string[]) {
    if (isFieldAndOperator(expression)) {
      let where = 'where ';

      if (!expression.field) {
        parts.push(where);
        return;
      }

      where += `${expression.field.value} `;

      if (!expression.operator) {
        parts.push(where);
        return;
      }

      // we should skip having the whole operator object
      // and only have the value here directly on the operator.
      where += `${expression.operator.operator.value} `;

      // we should probably break this kind of code out into smaller function that
      // can be resued whint the parser.
      if (isMultiOperator(expression.operator)) {
        where += '(';
        where += expression.operator.values.map(value => `'${value}'`).join(',');
        where += ')';
      }

      parts.push(where);
    }

    if (isRepeater(expression)) {
      for (const exp of expression.expressions) {
        this.appendWhere(exp, parts);
      }
    }
  }
}
