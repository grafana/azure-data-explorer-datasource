import { QueryExpression, AdxColumnSchema } from './types';
import { QueryEditorPropertyType } from 'editor/types';
import { getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import {
  isReduceExpression,
  isFieldExpression,
  isFieldAndOperator,
  isMultiOperator,
  isSingleOperator,
  isGroupBy,
  isDateGroupBy,
  isAndExpression,
  isOrExpression,
} from './editor/guards';
import { QueryEditorExpression, QueryEditorOperatorExpression, QueryEditorArrayExpression } from './editor/expressions';
import { columnsToDefinition } from 'schema/mapper';

export class KustoExpressionParser {
  templateSrv: TemplateSrv;

  constructor(private limit: number = 10000) {
    this.templateSrv = getTemplateSrv();
  }

  fromTable(expression?: QueryEditorExpression, interpolate = false): string {
    if (expression && isFieldExpression(expression)) {
      if (interpolate) {
        return this.templateSrv.replace(expression.property.name);
      } else {
        return expression.property.name;
      }
    }
    return '';
  }

  query(sections: QueryExpression | undefined, columns: AdxColumnSchema[] | undefined): string {
    if (!sections || !columns) {
      return '';
    }

    const { from, where, reduce, groupBy } = sections;
    const table = this.fromTable(from);

    if (!table) {
      return '';
    }

    const definitionColumns = columnsToDefinition(columns);
    const defaultTimeColumn = definitionColumns?.find(col => col.type === QueryEditorPropertyType.DateTime)?.value;
    const parts: string[] = [table];

    if (reduce && groupBy && this.isAggregated(groupBy)) {
      this.appendTimeFilter(groupBy, defaultTimeColumn, parts);
    } else if (defaultTimeColumn) {
      parts.push(`where $__timeFilter(${defaultTimeColumn})`);
    }

    if (where) {
      this.appendWhere(where, parts);
    }

    if (reduce && groupBy && this.isAggregated(groupBy)) {
      this.appendSummarize(reduce, groupBy, columns, parts);
    } else if (reduce) {
      this.appendProject(reduce, defaultTimeColumn, columns, parts);
    }

    parts.push(`take ${this.limit}`);

    return parts.join('\n| ');
  }

  appendTimeFilter(
    groupByExpression: QueryEditorArrayExpression,
    defaultTimeColumn: string | undefined,
    parts: string[]
  ) {
    let dateTimeField = defaultTimeColumn;

    if (groupByExpression) {
      dateTimeField = this.getGroupByFields(groupByExpression).dateTimeField || defaultTimeColumn;
    }

    if (dateTimeField) {
      parts.push(`where $__timeFilter(${dateTimeField})`);
    }
  }

  appendProject(
    expression: QueryEditorArrayExpression,
    defaultTimeColumn: string | undefined,
    columns: AdxColumnSchema[],
    parts: string[]
  ) {
    let project = 'project ';
    let timeCol = defaultTimeColumn;

    const fields: string[] = [];

    for (const exp of expression.expressions) {
      if (isReduceExpression(exp) && exp.property?.name) {
        if (exp.property.type === QueryEditorPropertyType.DateTime) {
          timeCol = exp.property.name;
        } else {
          fields.push(exp.property.name);
        }
      }
    }

    let toProject: string[] = [];

    if (timeCol) {
      toProject.push(timeCol);
    }

    if (fields.length > 0) {
      project += toProject
        .concat(fields)
        .map(field => this.castIfDynamic(field, columns))
        .join(', ');

      parts.push(project);
    }

    if (timeCol) {
      const orderBy = `order by ${this.castIfDynamic(timeCol, columns)} asc`;
      parts.push(orderBy);
    }
  }

  private createWhere(expression: QueryEditorOperatorExpression): string | undefined {
    let where = '';

    if (!expression.property) {
      return;
    }

    where += `${expression.property.name} `;

    if (!expression.operator) {
      return where;
    }

    // we should skip having the whole operator object
    // and only have the value here directly on the operator.
    where += `${expression.operator.name} `;

    // we should probably break this kind of code out into smaller function that
    // can be reused in the parser.
    if (isMultiOperator(expression.operator)) {
      where += '(';
      where += expression.operator.value.map(this.processMultiValueFilter.bind(this)).join(', ');
      where += ')';
    } else if (isSingleOperator(expression.operator)) {
      if (
        expression.property.type === QueryEditorPropertyType.String &&
        !this.isQuotedString(expression.operator.value)
      ) {
        where += `'${expression.operator.value}'`;
      } else {
        where += expression.operator.value;
      }
    }

    return where;
  }

  private processMultiValueFilter(value: string) {
    if (this.isVariable(value)) {
      return value;
    } else {
      return `'${value}'`;
    }
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
    reduceExpression: QueryEditorArrayExpression,
    groupByExpression: QueryEditorArrayExpression,
    columns: AdxColumnSchema[],
    parts: string[]
  ) {
    let summarize = 'summarize ';
    let reduceExpressions: string[] = [];

    for (const exp of reduceExpression.expressions) {
      if (isReduceExpression(exp) && exp?.reduce?.name !== 'none' && exp?.property?.name) {
        const field = this.castIfDynamic(exp.property.name, columns);

        if (exp?.parameters && exp?.parameters.length > 0) {
          reduceExpressions.push(`${exp.reduce.name}(${field}, ${exp.parameters.map(p => p.value).join(', ')})`);
        } else {
          reduceExpressions.push(`${exp.reduce.name}(${field})`);
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
      summarize += fields.groupByFields.map(field => this.castIfDynamic(field, columns)).join(', ');
    }

    parts.push(summarize);

    if (fields.dateTimeField) {
      const orderBy = `order by ${this.castIfDynamic(fields.dateTimeField, columns)} asc`;
      parts.push(orderBy);
    }
  }

  private castIfDynamic(column: string, columns: AdxColumnSchema[]): string {
    if (!column || column.indexOf('.') < 0) {
      return column;
    }

    const columnSchema = columns.find(c => c.Name === column);
    const columnType = columnSchema?.CslType;

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

  private getGroupByFields(groupByExpression: QueryEditorArrayExpression): GroupByFields {
    let dateTimeField = '';
    let interval = '';
    let groupByFields: string[] = [];

    for (const exp of groupByExpression.expressions) {
      if (isGroupBy(exp) && isDateGroupBy(exp) && exp.interval) {
        dateTimeField = exp.property.name;
        interval = exp.interval.name;
      } else if (isGroupBy(exp) && !isDateGroupBy(exp) && exp.property && exp.property.name) {
        groupByFields.push(exp.property.name);
      }
    }

    return { dateTimeField, interval, groupByFields };
  }

  private isAggregated(exp: QueryEditorArrayExpression): boolean {
    return exp.expressions.length > 0;
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
