import { QueryExpression, AdxColumnSchema } from './types';
import { QueryEditorPropertyType } from 'editor/types';
import { getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import {
  isReduceExpression,
  isFieldAndOperator,
  isGroupBy,
  isOrExpression,
  isMultiExpression,
  isAndExpression,
} from './editor/guards';
import {
  QueryEditorExpression,
  QueryEditorOperatorExpression,
  QueryEditorArrayExpression,
  QueryEditorPropertyExpression,
} from './editor/expressions';
import { isArray } from 'lodash';
import { VariableModel } from '@grafana/data';

interface ParseContext {
  timeColumn?: string;
  castIfDynamic: (column: string) => string;
}
export class KustoExpressionParser {
  constructor(private limit: number = 10000, private templateSrv: TemplateSrv = getTemplateSrv()) {}

  toQuery(expression?: QueryExpression, tableSchema?: AdxColumnSchema[]): string {
    const context: ParseContext = {
      timeColumn: defaultTimeColumn(tableSchema, expression),
      castIfDynamic: (column: string) => castIfDynamic(column, tableSchema),
    };

    if (!expression || !expression.from) {
      return '';
    }

    const parts: string[] = [];
    this.appendProperty(context, expression.from, parts);
    this.appendTimeFilter(context, parts);
    this.appendWhere(context, expression?.where, parts, 'where');
    this.appendSummarize(context, expression.reduce, expression.groupBy, parts);
    this.appendOrderBy(context, parts);

    if (parts.length === 0) {
      return '';
    }

    parts.push(`take ${this.limit}`);
    return parts.join('\n| ');
  }

  private appendTimeFilter(context: ParseContext, parts: string[]) {
    if (!context.timeColumn) {
      return;
    }

    if (isDynamic(context.timeColumn)) {
      parts.push(`where ${context.timeColumn} between ($__timeFrom .. $__timeTo)`);
      return;
    }

    parts.push(`where $__timeFilter(${context.timeColumn})`);
  }

  private appendOrderBy(context: ParseContext, parts: string[]) {
    if (!context.timeColumn) {
      return;
    }
    parts.push(`order by ${context.timeColumn} asc`);
  }

  private appendWhere(
    context: ParseContext,
    expression: QueryEditorExpression | undefined,
    parts: string[],
    prefix?: string
  ) {
    if (!expression) {
      return;
    }

    if (isMultiExpression(expression) || isAndExpression(expression)) {
      return expression.expressions.forEach(exp => this.appendWhere(context, exp, parts, prefix));
    }

    if (isOrExpression(expression)) {
      const orParts: string[] = [];
      expression.expressions.map(exp => this.appendWhere(context, exp, orParts));
      return parts.push(`where ${orParts.join(' or ')}`);
    }

    if (isFieldAndOperator(expression)) {
      return this.appendOperator(context, expression, parts, prefix);
    }
  }

  private appendSummarize(
    context: ParseContext,
    reduce: QueryEditorArrayExpression | undefined,
    groupBy: QueryEditorArrayExpression | undefined,
    parts: string[]
  ) {
    const reduceParts: string[] = [];
    const groupByParts: string[] = [];
    const columns: string[] = [];

    for (const expression of reduce?.expressions ?? []) {
      if (!isReduceExpression(expression)) {
        continue;
      }

      const func = expression.reduce.name;
      const column = context.castIfDynamic(expression.property.name);
      columns.push(column);

      if (func === 'count') {
        reduceParts.push('count()');
        continue;
      }

      if (func !== 'none') {
        reduceParts.push(`${func}(${column})`);
        continue;
      }
    }

    for (const expression of groupBy?.expressions ?? []) {
      if (!isGroupBy(expression)) {
        continue;
      }

      const column = context.castIfDynamic(expression.property.name);

      if (expression.interval) {
        const interval = expression.interval.name;
        groupByParts.unshift(`bin(${column}, ${interval})`);
        continue;
      }

      groupByParts.push(column);
    }

    if (reduceParts.length > 0) {
      if (groupByParts.length > 0) {
        parts.push(`summarize ${reduceParts.join(', ')} by ${groupByParts.join(', ')}`);
        return;
      }
      parts.push(`summarize ${reduceParts.join(', ')}`);
      return;
    }

    if (groupByParts.length > 0) {
      parts.push(`summarize by ${groupByParts.join(', ')}`);
      return;
    }

    if (columns.length > 0) {
      parts.push(`project ${columns.join(', ')}`);
      return;
    }
  }

  private appendOperator(
    context: ParseContext,
    expression: QueryEditorOperatorExpression,
    parts: string[],
    prefix?: string
  ) {
    const { property, operator } = expression;
    const value = this.formatValue(operator.value, property.type);
    parts.push(withPrefix(`${property.name} ${operator.name} ${value}`, prefix));
  }

  private formatValue(value: any, type: QueryEditorPropertyType): string {
    if (Array.isArray(value)) {
      return `(${value.map(v => this.formatValue(v, type)).join(', ')})`;
    }

    if (this.isTemplateVariable(value)) {
      return value;
    }

    switch (type) {
      case QueryEditorPropertyType.Number:
      case QueryEditorPropertyType.Boolean:
        return value;
      default:
        return `'${value}'`;
    }
  }

  private appendProperty(context: ParseContext, expression: QueryEditorPropertyExpression, parts: string[]) {
    parts.push(expression.property.name);
  }

  private isTemplateVariable(value: string): boolean {
    if (!Array.isArray(this.templateSrv.getVariables())) {
      return false;
    }

    return !!this.templateSrv.getVariables().find((variable: any) => {
      return `$${variable?.id}` === value;
    });
  }

  // fromTable(expression?: QueryEditorExpression, interpolate = false): string {
  //   if (expression && isFieldExpression(expression)) {
  //     if (interpolate) {
  //       return this.templateSrv.replace(expression.property.name);
  //     } else {
  //       return expression.property.name;
  //     }
  //   }
  //   return '';
  // }

  // query(sections: QueryExpression | undefined, columns: AdxColumnSchema[] | undefined): string {
  //   if (!sections || !columns) {
  //     return '';
  //   }

  //   const { from, where, reduce, groupBy } = sections;
  //   const table = this.fromTable(from);

  //   if (!table) {
  //     return '';
  //   }

  //   const defaultTimeColumn = this.findDefaultTimeColumn(columns);
  //   const parts: string[] = [table];

  //   if (reduce && groupBy && this.isAggregated(groupBy)) {
  //     this.appendTimeFilter(groupBy, defaultTimeColumn, columns, parts);
  //   } else if (defaultTimeColumn) {
  //     parts.push(this.createTimeFilter(defaultTimeColumn, columns));
  //   }

  //   if (where) {
  //     this.appendWhere(where, parts);
  //   }

  //   if (reduce && groupBy && this.isAggregated(groupBy)) {
  //     this.appendSummarize(reduce, groupBy, columns, parts);
  //   } else if (reduce) {
  //     this.appendProject(reduce, defaultTimeColumn, columns, parts);
  //   }

  //   parts.push(`take ${this.limit}`);

  //   return parts.join('\n| ');
  // }

  // appendTimeFilter(
  //   groupByExpression: QueryEditorArrayExpression,
  //   defaultTimeColumn: string | undefined,
  //   columns: AdxColumnSchema[],
  //   parts: string[]
  // ) {
  //   let dateTimeField = defaultTimeColumn;

  //   if (groupByExpression) {
  //     dateTimeField = this.getGroupByFields(groupByExpression).dateTimeField || defaultTimeColumn;
  //   }

  //   if (dateTimeField) {
  //     parts.push(this.createTimeFilter(dateTimeField, columns));
  //   }
  // }

  // appendProject(
  //   expression: QueryEditorArrayExpression,
  //   defaultTimeColumn: string | undefined,
  //   columns: AdxColumnSchema[],
  //   parts: string[]
  // ) {
  //   let project = 'project ';
  //   let timeCol = defaultTimeColumn;

  //   const fields: string[] = [];

  //   for (const exp of expression.expressions) {
  //     if (isReduceExpression(exp) && exp.property?.name) {
  //       if (exp.property.type === QueryEditorPropertyType.DateTime) {
  //         timeCol = exp.property.name;
  //       } else {
  //         fields.push(exp.property.name);
  //       }
  //     }
  //   }

  //   let toProject: string[] = [];

  //   if (timeCol) {
  //     toProject.push(timeCol);
  //   }

  //   if (fields.length > 0) {
  //     project += toProject
  //       .concat(fields)
  //       .map(field => this.castIfDynamic(field, columns))
  //       .join(', ');

  //     parts.push(project);
  //   }

  //   if (timeCol) {
  //     const orderBy = `order by ${this.castIfDynamic(timeCol, columns)} asc`;
  //     parts.push(orderBy);
  //   }
  // }

  // private createWhere(expression: QueryEditorOperatorExpression): string | undefined {
  //   let where = '';

  //   if (!expression.property) {
  //     return;
  //   }

  //   where += `${expression.property.name} `;

  //   if (!expression.operator) {
  //     return where;
  //   }

  //   // we should skip having the whole operator object
  //   // and only have the value here directly on the operator.
  //   where += `${expression.operator.name} `;

  //   // we should probably break this kind of code out into smaller function that
  //   // can be reused in the parser.
  //   if (isMultiOperator(expression.operator)) {
  //     where += '(';
  //     where += expression.operator.value.map(this.processMultiValueFilter.bind(this)).join(', ');
  //     where += ')';
  //   } else if (isSingleOperator(expression.operator)) {
  //     if (
  //       expression.property.type === QueryEditorPropertyType.String &&
  //       !this.isQuotedString(expression.operator.value)
  //     ) {
  //       where += `'${expression.operator.value}'`;
  //     } else {
  //       where += expression.operator.value;
  //     }
  //   }

  //   return where;
  // }

  // private processMultiValueFilter(value: string) {
  //   if (this.isVariable(value)) {
  //     return value;
  //   } else {
  //     return `'${value}'`;
  //   }
  // }

  // private appendWhere(expression: QueryEditorExpression, parts: string[]) {
  //   if (isAndExpression(expression)) {
  //     return expression.expressions.map(and => this.appendWhere(and, parts));
  //   }

  //   if (isOrExpression(expression)) {
  //     const orParts = expression.expressions
  //       .map(orExpression => {
  //         if (!isFieldAndOperator(orExpression)) {
  //           return;
  //         }
  //         return this.createWhere(orExpression);
  //       })
  //       .filter(part => !!part);

  //     if (orParts.length > 0) {
  //       parts.push(`where ${orParts.join(' or ')}`);
  //     }

  //     return;
  //   }

  //   if (isFieldAndOperator(expression)) {
  //     const statement = this.createWhere(expression);

  //     if (statement) {
  //       parts.push(`where ${statement}`);
  //     }

  //     return;
  //   }
  // }

  // private appendSummarize(
  //   reduceExpression: QueryEditorArrayExpression,
  //   groupByExpression: QueryEditorArrayExpression,
  //   columns: AdxColumnSchema[],
  //   parts: string[]
  // ) {
  //   let summarize = 'summarize ';
  //   let reduceExpressions: string[] = [];

  //   for (const exp of reduceExpression.expressions) {
  //     if (isReduceExpression(exp) && exp?.reduce?.name !== 'none' && exp?.property?.name) {
  //       const field = this.castIfDynamic(exp.property.name, columns);

  //       if (exp?.parameters && exp?.parameters.length > 0) {
  //         reduceExpressions.push(`${exp.reduce.name}(${field}, ${exp.parameters.map(p => p.value).join(', ')})`);
  //       } else {
  //         reduceExpressions.push(`${exp.reduce.name}(${field})`);
  //       }
  //     }
  //   }

  //   summarize += reduceExpressions.join(', ');

  //   const fields = this.getGroupByFields(groupByExpression);
  //   if (fields.dateTimeField) {
  //     summarize += ` by bin(${this.castIfDynamic(fields.dateTimeField, columns)}, ${fields.interval})`;
  //   }
  //   if (fields.groupByFields.length > 0) {
  //     if (fields.dateTimeField) {
  //       summarize += `,`;
  //     } else {
  //       summarize += ' by ';
  //     }
  //     summarize += fields.groupByFields.map(field => this.castIfDynamic(field, columns)).join(', ');
  //   }

  //   parts.push(summarize);

  //   if (fields.dateTimeField) {
  //     const orderBy = `order by ${this.castIfDynamic(fields.dateTimeField, columns)} asc`;
  //     parts.push(orderBy);
  //   }
  // }

  // private createTimeFilter(timeColumn: string, columnSchema: AdxColumnSchema[]): string {
  //   if (this.isDynamic(timeColumn)) {
  //     return `where ${this.castIfDynamic(timeColumn, columnSchema)} between ($__timeFrom .. $__timeTo)`;
  //   }
  //   return `where $__timeFilter(${timeColumn})`;
  // }

  // private findDefaultTimeColumn(columns: AdxColumnSchema[]): string | undefined {
  //   const firstLevelColumn = columns?.find(col => {
  //     return col.CslType === 'datetime' && col.Name.indexOf('.') === -1;
  //   });

  //   if (firstLevelColumn) {
  //     return firstLevelColumn?.Name;
  //   }

  //   const column = columns?.find(col => col.CslType === 'datetime');
  //   return column?.Name;
  // }

  // private isDynamic(column: string): boolean {
  //   return !!(column && column.indexOf('.') > -1);
  // }

  // private castIfDynamic(column: string, columns: AdxColumnSchema[]): string {
  //   if (!this.isDynamic(column)) {
  //     return column;
  //   }

  //   const columnSchema = columns.find(c => c.Name === column);
  //   const columnType = columnSchema?.CslType;

  //   if (!columnType) {
  //     return column;
  //   }

  //   const parts = column.split('.');

  //   return parts.reduce((result: string, part, index) => {
  //     if (!result) {
  //       return `todynamic(${part})`;
  //     }

  //     if (index + 1 === parts.length) {
  //       return `to${columnType}(${result}.${part})`;
  //     }

  //     return `todynamic(${result}.${part})`;
  //   }, '');
  // }

  // private getGroupByFields(groupByExpression: QueryEditorArrayExpression): GroupByFields {
  //   let dateTimeField = '';
  //   let interval = '';
  //   let groupByFields: string[] = [];

  //   for (const exp of groupByExpression.expressions) {
  //     if (isGroupBy(exp) && isDateGroupBy(exp) && exp.interval) {
  //       dateTimeField = exp.property.name;
  //       interval = exp.interval.name;
  //     } else if (isGroupBy(exp) && !isDateGroupBy(exp) && exp.property && exp.property.name) {
  //       groupByFields.push(exp.property.name);
  //     }
  //   }

  //   return { dateTimeField, interval, groupByFields };
  // }

  // private isAggregated(exp: QueryEditorArrayExpression): boolean {
  //   return exp.expressions.length > 0;
  // }

  // private isQuotedString(value: string): boolean {
  //   return (
  //     (value[0] === "'" || value[0] === '"') && (value[value.length - 1] === "'" || value[value.length - 1] === '"')
  //   );
  // }

  // private isVariable(value: string): boolean {
  //   const variables = this.templateSrv.getVariables();
  //   for (const variable of variables) {
  //     if ('$' + variable.name === value) {
  //       return true;
  //     }
  //   }

  //   return false;
  // }
}

// interface GroupByFields {
//   dateTimeField: string;
//   interval: string;
//   groupByFields: string[];
// }

const withPrefix = (value: string, prefix?: string): string => {
  if (prefix) {
    return `${prefix} ${value}`;
  }
  return value;
};

const defaultTimeColumn = (columns?: AdxColumnSchema[], expression?: QueryExpression): string | undefined => {
  if (Array.isArray(expression?.groupBy.expressions)) {
    const groupByTimeColumn = expression?.groupBy.expressions.find(exp => {
      if (!isGroupBy(exp)) {
        return false;
      }
      return exp.property.type === QueryEditorPropertyType.DateTime && exp.interval;
    });

    if (isGroupBy(groupByTimeColumn)) {
      return castIfDynamic(groupByTimeColumn.property.name, columns);
    }
  }

  if (!Array.isArray(columns)) {
    return;
  }

  const firstLevelColumn = columns?.find(col => {
    return col.CslType === 'datetime' && col.Name.indexOf('.') === -1;
  });

  if (firstLevelColumn) {
    return firstLevelColumn?.Name;
  }

  const column = columns?.find(col => col.CslType === 'datetime');

  if (!column) {
    return column;
  }

  return toDynamic(column);
};

const isDynamic = (column: string): boolean => {
  return !!(column && column.indexOf('.') > -1) || !!(column && column.indexOf('todynamic') > -1);
};

const castIfDynamic = (column: string, tableSchema?: AdxColumnSchema[]): string => {
  if (!isDynamic(column) || !isArray(tableSchema)) {
    return column;
  }

  const columnSchema = tableSchema.find(c => c.Name === column);

  if (!columnSchema) {
    return column;
  }

  return toDynamic(columnSchema);
};

const toDynamic = (column: AdxColumnSchema): string => {
  const parts = column.Name.split('.');

  return parts.reduce((result: string, part, index) => {
    if (!result) {
      return `todynamic(${part})`;
    }

    if (index + 1 === parts.length) {
      return `to${column.CslType}(${result}.${part})`;
    }

    return `todynamic(${result}.${part})`;
  }, '');
};
