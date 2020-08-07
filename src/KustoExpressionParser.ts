import { QueryExpression } from './types';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from 'editor/types';
import { getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import {
  isReduceExpression,
  isFieldExpression,
  isFieldAndOperator,
  isMultiOperator,
  isSingleOperator,
  isGroupBy,
  isDateGroupBy,
  isRepeater,
  isAndExpression,
  isOrExpression,
} from './editor/guards';
import { QueryEditorExpression, QueryEditorFieldAndOperatorExpression } from './editor/expressions';
import { AdxSchemaResolver } from 'SchemaResolver';

export class KustoExpressionParser {
  templateSrv: TemplateSrv;

  constructor(private schemaResolver: AdxSchemaResolver) {
    this.templateSrv = getTemplateSrv();
  }

  fromTable(expression?: QueryEditorExpression, interpolate = false): string {
    if (expression && isFieldExpression(expression)) {
      if (interpolate) {
        return this.templateSrv.replace(expression.value);
      } else {
        return expression.value;
      }
    }
    return '';
  }

  // we need to write tests for this one but I would like to have one expression tree
  // that is the entry before doing that.
  query(sections: QueryExpression, columns: QueryEditorFieldDefinition[], database: string): string {
    const { from, where, reduce, groupBy } = sections;
    const table = this.fromTable(from);

    if (!table) {
      return '';
    }

    const defaultTimeColumn = columns?.find(col => col.type === QueryEditorFieldType.DateTime)?.value ?? 'Timestamp';
    const parts: string[] = [table];

    if (reduce && groupBy && this.isAggregated(groupBy)) {
      this.appendTimeFilter(groupBy, defaultTimeColumn, parts);
    } else {
      parts.push(`where $__timeFilter(${defaultTimeColumn})`);
    }

    if (where) {
      this.appendWhere(where, parts);
    }

    if (reduce && groupBy && this.isAggregated(groupBy)) {
      this.appendSummarize(database, table, reduce, groupBy, parts);
    } else if (reduce) {
      this.appendProject(reduce, defaultTimeColumn, parts);
    }

    return parts.join('\n| ');
  }

  appendTimeFilter(groupByExpression: QueryEditorExpression, defaultTimeColumn: string, parts: string[]) {
    let dateTimeField = defaultTimeColumn;

    if (groupByExpression) {
      dateTimeField = this.getGroupByFields(groupByExpression).dateTimeField || defaultTimeColumn;
    }

    parts.push(`where $__timeFilter(${dateTimeField})`);
  }

  appendProject(expression: QueryEditorExpression, defaultTimeColumn: string, parts: string[]) {
    let project = 'project ';
    let timeCol = defaultTimeColumn;

    const fields: string[] = [];

    if (isRepeater(expression)) {
      for (const exp of expression.expressions) {
        if (isReduceExpression(exp) && exp.field?.value) {
          if (exp.field.fieldType === QueryEditorFieldType.DateTime) {
            timeCol = exp.field.value;
          } else {
            fields.push(exp.field.value);
          }
        }
      }
    } else if (isReduceExpression(expression)) {
      fields.push(expression.field.value);
    }

    if (fields.length > 0) {
      project += [timeCol].concat(fields).join(', ');
      parts.push(project);
    }

    const orderBy = `order by ${timeCol} asc`;
    parts.push(orderBy);
  }

  private createWhere(expression: QueryEditorFieldAndOperatorExpression): string | undefined {
    let where = '';

    if (!expression.field) {
      return;
    }

    where += `${expression.field.value} `;

    if (!expression.operator) {
      return where;
    }

    // we should skip having the whole operator object
    // and only have the value here directly on the operator.
    where += `${expression.operator.operator.value} `;

    // we should probably break this kind of code out into smaller function that
    // can be reused in the parser.
    if (isMultiOperator(expression.operator)) {
      where += '(';
      where += expression.operator.values
        .map(value => {
          if (this.isVariable(value)) {
            return value;
          } else {
            return `'${value}'`;
          }
        })
        .join(', ');
      where += ')';
    } else if (isSingleOperator(expression.operator)) {
      if (
        expression.field.fieldType === QueryEditorFieldType.String &&
        !this.isQuotedString(expression.operator.value)
      ) {
        where += `'${expression.operator.value}'`;
      } else {
        where += expression.operator.value;
      }
    }

    return where;
  }

  private appendWhere(expression: QueryEditorExpression, parts: string[]) {
    if (isAndExpression(expression)) {
      return expression.expressions.map(and => this.appendWhere(and, parts));
    }

    if (isOrExpression(expression)) {
      const orParts = expression.expressions
        .map(orExpression => {
          if (!isFieldAndOperator(orExpression)) {
            return;
          }
          return this.createWhere(orExpression);
        })
        .filter(part => !!part);

      if (orParts.length > 0) {
        parts.push(`where ${orParts.join(' or ')}`);
      }

      return;
    }

    if (isFieldAndOperator(expression)) {
      const statement = this.createWhere(expression);

      if (statement) {
        parts.push(`where ${statement}`);
      }

      return;
    }
  }

  private appendSummarize(
    database: string,
    table: string,
    reduceExpression: QueryEditorExpression,
    groupByExpression: QueryEditorExpression,
    parts: string[]
  ) {
    if (isRepeater(groupByExpression) && isRepeater(reduceExpression)) {
      let summarize = 'summarize ';
      let reduceExpressions: string[] = [];

      for (const exp of reduceExpression.expressions) {
        if (isReduceExpression(exp) && exp?.reduce?.value !== 'none' && exp?.field?.value) {
          const field = this.castIfDynamic(database, table, exp.field.value);

          if (exp?.parameters && exp?.parameters.length > 0) {
            reduceExpressions.push(`${exp.reduce.value}(${field}, ${exp.parameters.map(p => p.value).join(', ')})`);
          } else {
            reduceExpressions.push(`${exp.reduce.value}(${field})`);
          }
        }
      }

      summarize += reduceExpressions.join(', ');

      const fields = this.getGroupByFields(groupByExpression);
      if (fields.dateTimeField) {
        summarize += ` by bin(${fields.dateTimeField}, ${fields.interval})`;
      }
      if (fields.groupByFields.length > 0) {
        if (fields.dateTimeField) {
          summarize += `,`;
        } else {
          summarize += ' by ';
        }
        summarize += fields.groupByFields.join(', ');
      }

      parts.push(summarize);

      if (fields.dateTimeField) {
        const orderBy = `order by ${fields.dateTimeField} asc`;
        parts.push(orderBy);
      }
    }
  }

  private castIfDynamic(database: string, table: string, column: string): string {
    if (!column || column.indexOf('.') < 0) {
      return column;
    }

    const columnType = this.schemaResolver.getColumnType(database, table, column);

    if (!columnType) {
      return column;
    }

    const parts = column.split('.');

    return parts.reduce((result: string, part, index) => {
      if (!result) {
        return `todynamic(${part})`;
      }

      if (index + 1 === parts.length) {
        return `to${columnType}(${result}.${part})`;
      }

      return `todynamic(${result}.${part})`;
    }, '');
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

  private isVariable(value: string): boolean {
    const variables = this.templateSrv.getVariables();
    for (const variable of variables) {
      if ('$' + variable.name === value) {
        return true;
      }
    }

    return false;
  }
}

interface GroupByFields {
  dateTimeField: string;
  interval: string;
  groupByFields: string[];
}
