import { QueryExpression, AdxColumnSchema, AutoCompleteQuery } from './types';
import { QueryEditorPropertyType } from 'editor/types';
import { getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import {
  isReduceExpression,
  isFieldAndOperator,
  isGroupBy,
  isOrExpression,
  isAndExpression,
  isArrayExpression,
} from './editor/guards';
import {
  QueryEditorExpression,
  QueryEditorOperatorExpression,
  QueryEditorArrayExpression,
  QueryEditorPropertyExpression,
} from './editor/expressions';
import { cloneDeep } from 'lodash';

interface ParseContext {
  timeColumn?: string;
  castIfDynamic: (column: string) => string;
}
export class KustoExpressionParser {
  constructor(private limit: number = 10000, private templateSrv: TemplateSrv = getTemplateSrv()) {}

  toAutoCompleteQuery(query?: AutoCompleteQuery, tableSchema?: AdxColumnSchema[]): string {
    if (!query?.expression || !query.expression.from || !query.search.property) {
      return '';
    }

    const context: ParseContext = {
      timeColumn: defaultTimeColumn(tableSchema, query?.expression),
      castIfDynamic: (column: string) => castIfDynamic(column, tableSchema),
    };

    const parts: string[] = [];
    this.appendProperty(context, query.expression.from, parts);
    this.appendTimeFilter(context, parts);

    const where = replaceByIndex(query.index, query.expression.where, query.search);
    const column = query.search.property.name;
    this.appendWhere(context, where, parts, 'where');

    parts.push('take 50000');
    parts.push(`distinct ${context.castIfDynamic(column)}`);
    parts.push('take 251');

    return parts.join('\n| ');
  }

  toQuery(expression?: QueryExpression, tableSchema?: AdxColumnSchema[]): string {
    if (!expression || !expression.from) {
      return '';
    }

    const context: ParseContext = {
      timeColumn: defaultTimeColumn(tableSchema, expression),
      castIfDynamic: (column: string) => castIfDynamic(column, tableSchema),
    };

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

    if (isAndExpression(expression)) {
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
}

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
  if (!isDynamic(column) || !Array.isArray(tableSchema)) {
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

const replaceByIndex = (
  index: string,
  expression: QueryEditorArrayExpression,
  operator: QueryEditorOperatorExpression
): QueryEditorArrayExpression => {
  const keys = index.split('-').map(n => parseInt(n, 10));

  let where = cloneDeep(expression);
  let current = where.expressions;

  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];

    if (index === keys.length - 1) {
      current[key] = operator;
      break;
    }

    if (Array.isArray(current)) {
      const exp = current[key];

      if (isArrayExpression(exp)) {
        current = exp.expressions;
        continue;
      }
    }
  }

  return where;
};
