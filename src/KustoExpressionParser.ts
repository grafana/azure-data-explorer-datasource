import { isField } from 'editor/components/field/QueryEditorField';
import { isRepeater } from 'editor/components/QueryEditorRepeater';
import { isMultiOperator } from 'editor/components/operators/QueryEditorMultiOperator';
import { QueryEditorExpression, QueryEditorSectionExpression, QueryExpression } from './types';
import { isFieldAndOperator } from './editor/components/filter/QueryEditorFieldAndOperator';
import { isGroupBy, isDateGroupBy } from 'editor/components/groupBy/QueryEditorGroupBy';
import { isReduce } from 'editor/components/reduce/QueryEditorReduce';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from 'editor/types';
import { isSingleOperator } from 'editor/components/operators/QueryEditorSingleOperator';

export class KustoExpressionParser {
  fromTable(section?: QueryEditorSectionExpression): string {
    if (section && section.expression && isField(section.expression)) {
      return section.expression.value;
    }
    return '';
  }

  // we need to write tests for this one but I would like to have one expression tree
  // that is the entry before doing that.
  query(sections: QueryExpression, columns: QueryEditorFieldDefinition[]): string {
    const { from, where, reduce, groupBy } = sections;
    const table = this.fromTable(from);

    if (!table) {
      return '';
    }

    const defaultTimeColumn = columns?.find(col => col.type === QueryEditorFieldType.DateTime)?.value ?? 'Timestamp';

    const parts: string[] = [table];

    if (reduce && reduce.expression && groupBy && groupBy.expression && this.isAggregated(groupBy.expression)) {
      this.appendTimeFilter(reduce.expression, groupBy.expression, parts);
    } else {
      parts.push(`where $__timeFilter(${defaultTimeColumn})`);
    }

    if (!where || !where.expression) {
      return parts.join('\n| ');
    }

    this.appendWhere(where.expression, parts);

    if (reduce && reduce.expression && groupBy && groupBy.expression && this.isAggregated(groupBy.expression)) {
      this.appendSummarize(reduce.expression, groupBy.expression, parts);
    } else if (reduce && reduce.expression) {
      this.appendProject(reduce?.expression, defaultTimeColumn, parts);
    }

    return parts.join('\n| ');
  }

  appendTimeFilter(reduceExpression: QueryEditorExpression, groupByExpression: QueryEditorExpression, parts: string[]) {
    let dateTimeField = 'Timestamp';

    if (groupByExpression) {
      dateTimeField = this.getGroupByFields(groupByExpression).dateTimeField;
    }

    parts.push(`where $__timeFilter(${dateTimeField})`);
  }

  appendProject(expression: QueryEditorExpression, defaultTimeColumn: string, parts: string[]) {
    let project = 'project ';
    const fields: string[] = [defaultTimeColumn];

    if (isRepeater(expression)) {
      for (const exp of expression.expressions) {
        if (isReduce(exp) && exp.field?.value) {
          fields.push(exp.field.value);
        }
      }
    } else if (isReduce(expression)) {
      fields.push(expression.field.value);
    }

    project += fields.join(', ');
    parts.push(project);

    const orderBy = `order by ${defaultTimeColumn} asc`;
    parts.push(orderBy);
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
      // can be reused in the parser.
      if (isMultiOperator(expression.operator)) {
        where += '(';
        where += expression.operator.values.map(value => `'${value}'`).join(',');
        where += ')';
      } else if (isSingleOperator(expression.operator)) {
        if (
          expression.field.fieldType == QueryEditorFieldType.String &&
          !this.isQuotedString(expression.operator.value)
        ) {
          where += `'${expression.operator.value}'`;
        } else {
          where += expression.operator.value;
        }
      }

      parts.push(where);
    }

    if (isRepeater(expression)) {
      for (const exp of expression.expressions) {
        this.appendWhere(exp, parts);
      }
    }
  }

  private appendSummarize(
    reduceExpression: QueryEditorExpression,
    groupByExpression: QueryEditorExpression,
    parts: string[]
  ) {
    if (isRepeater(groupByExpression) && isRepeater(reduceExpression)) {
      let summarize = 'summarize ';
      let reduceExpressions: string[] = [];

      for (const exp of reduceExpression.expressions) {
        if (isReduce(exp) && exp?.reduce?.value && exp?.field?.value) {
          reduceExpressions.push(`${exp.reduce.value}(${exp.field.value})`);
        }
      }

      summarize += reduceExpressions.join(', ');

      const fields = this.getGroupByFields(groupByExpression);
      summarize += ` by bin(${fields.dateTimeField}, ${fields.interval})`;
      if (fields.groupByFields.length > 0) {
        summarize += `,` + fields.groupByFields.join(', ');
      }

      parts.push(summarize);

      const orderBy = `order by ${fields.dateTimeField} asc`;
      parts.push(orderBy);
    }
  }

  private getGroupByFields(groupByExpression: QueryEditorExpression): GroupByFields {
    let dateTimeField = '';
    let interval = '';
    let groupByFields: string[] = [];

    if (isRepeater(groupByExpression)) {
      for (const exp of groupByExpression.expressions) {
        if (isGroupBy(exp) && isDateGroupBy(exp) && exp.interval) {
          dateTimeField = exp.field.value;
          interval = exp.interval.value;
        } else if (isGroupBy(exp) && !isDateGroupBy(exp) && exp.field && exp.field.value) {
          groupByFields.push(exp.field.value);
        }
      }
    }

    return { dateTimeField, interval, groupByFields };
  }

  private isAggregated(exp: QueryEditorExpression): boolean {
    return isRepeater(exp) && exp.expressions.length > 0;
  }

  private isQuotedString(value: string): boolean {
    return (
      (value[0] === "'" || value[0] === '"') && (value[value.length - 1] === "'" || value[value.length - 1] === '"')
    );
  }
}

interface GroupByFields {
  dateTimeField: string;
  interval: string;
  groupByFields: string[];
}
