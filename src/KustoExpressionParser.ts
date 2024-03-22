import { QueryExpression, AdxColumnSchema, AutoCompleteQuery } from './types';
import { QueryEditorPropertyType } from './schema/types';
import { getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import {
  isReduceExpression,
  isFieldAndOperator,
  isGroupBy,
  isOrExpression,
  isAndExpression,
  isArrayExpression,
} from './guards';
import {
  QueryEditorExpression,
  QueryEditorOperatorExpression,
  QueryEditorArrayExpression,
  QueryEditorPropertyExpression,
} from './types/expressions';
import { cloneDeep } from 'lodash';
import { SelectableValue } from '@grafana/data';
import { filterColumns } from 'components/QueryEditor/VisualQueryEditor/utils/utils';

interface ParseContext {
  timeColumn?: string;
  castIfDynamic: (column: string, schemaName?: string) => string;
}

export const DYNAMIC_TYPE_ARRAY_DELIMITER = '["`indexer`"]';

export const escapeColumn = (column: string) => {
  return column.match(/[\s\.-]/) ? `["${column}"]` : column;
};

export class KustoExpressionParser {
  constructor(private templateSrv: TemplateSrv = getTemplateSrv()) {}

  toAutoCompleteQuery(query?: AutoCompleteQuery, tableSchema?: AdxColumnSchema[]): string {
    if (!query?.expression || !query.expression.from || !query.search.property) {
      return '';
    }

    const context: ParseContext = {
      timeColumn: defaultTimeColumn(tableSchema, query?.expression),
      castIfDynamic: (column: string, schemaName?: string) => escapeAndCastIfDynamic(column, tableSchema, schemaName),
    };

    const parts: string[] = [];
    const expandParts: string[] = [];
    const name: string = this.addExpanPartsdIfNeeded(query.search.property.name, expandParts);
    const column = context.castIfDynamic(name, query.search.property.name);
    this.appendProperty(context, query.expression.from, parts);
    this.appendTimeFilter(context, undefined, parts, tableSchema);
    this.appendMvExpand(expandParts, parts);

    if (expandParts.length) {
      // Replace the column name in the search expression with the "expanded" column name
      query.search.property.name = name;
    }

    //query.index is used by the legacy query editor
    if (query.index) {
      const where = replaceByIndex(query.index, query.expression.where, query.search);
      this.appendWhere(context, where, parts, 'where');
    } else {
      this.appendWhere(context, query.search, parts, 'where');
    }

    parts.push('take 50000');
    parts.push(`distinct ${column}`);
    parts.push('take 251');

    return parts.join('\n| ');
  }

  toQuery(expression?: QueryExpression, tableSchema?: AdxColumnSchema[]): string {
    if (!expression || !expression.from) {
      return '';
    }

    const columns = filterColumns(tableSchema, expression.columns);
    const context: ParseContext = {
      timeColumn: defaultTimeColumn(columns, expression),
      castIfDynamic: (column: string, schemaName?: string) => escapeAndCastIfDynamic(column, tableSchema, schemaName),
    };

    const parts: string[] = [];
    this.appendProperty(context, expression.from, parts);
    this.appendProject(expression.columns?.columns, parts);
    this.appendTimeFilter(context, expression.timeshift, parts, columns);
    this.appendWhere(context, expression?.where, parts, 'where');
    this.appendTimeshift(context, expression.timeshift, parts);
    this.appendSummarize(context, expression.reduce, expression.groupBy, parts);
    this.appendOrderBy(context, expression.groupBy, expression.reduce, parts);

    if (parts.length === 0) {
      return '';
    }

    return parts.join('\n| ');
  }

  private appendTimeshift(
    context: ParseContext,
    expression: QueryEditorPropertyExpression | undefined,
    parts: string[]
  ) {
    const timeshift = detectTimeshift(context, expression);

    if (!timeshift) {
      return;
    }
    parts.push(`extend ${context.timeColumn} = ${context.timeColumn} + ${timeshift}`);
  }

  private appendTimeFilter(
    context: ParseContext,
    expression: QueryEditorPropertyExpression | undefined,
    parts: string[],
    tableSchema?: AdxColumnSchema[]
  ) {
    if (!context.timeColumn) {
      return;
    }

    const timeshift = detectTimeshift(context, expression);

    if (timeshift) {
      parts.push(`where ${context.timeColumn} between (($__timeFrom - ${timeshift}) .. ($__timeTo - ${timeshift}))`);
      return;
    }

    if (context.timeColumn.includes('todatetime')) {
      parts.push(`where ${context.timeColumn} between ($__timeFrom .. $__timeTo)`);
      return;
    }

    parts.push(`where $__timeFilter(${context.timeColumn})`);
  }

  private appendOrderBy(
    context: ParseContext,
    groupBy: QueryEditorArrayExpression,
    reduce: QueryEditorArrayExpression,
    parts: string[]
  ) {
    if (!context.timeColumn) {
      return;
    }

    const noGroupBy = Array.isArray(groupBy.expressions) && groupBy.expressions.length === 0;
    const noReduce = Array.isArray(reduce.expressions) && reduce.expressions.length === 0;

    if (noGroupBy && noReduce) {
      parts.push(`order by ${context.timeColumn} asc`);
      return;
    }

    const hasInterval = groupBy.expressions.find((exp) => {
      if (!isGroupBy(exp) || !exp.interval) {
        return false;
      }
      return true;
    });

    if (hasInterval) {
      parts.push(`order by ${context.timeColumn} asc`);
      return;
    }
  }

  private appendWhere(
    context: ParseContext,
    expression: QueryEditorExpression | undefined,
    parts: string[],
    prefix?: string,
    expandParts?: string[]
  ) {
    if (!expression) {
      return;
    }
    const eParts = expandParts ? expandParts : [];

    if (isAndExpression(expression)) {
      return expression.expressions.forEach((exp) => this.appendWhere(context, exp, parts, prefix, eParts));
    }

    if (isOrExpression(expression)) {
      const orParts: string[] = [];
      expression.expressions.map((exp) => this.appendWhere(context, exp, orParts, undefined, eParts));
      if (orParts.length === 0) {
        return;
      }
      this.appendMvExpand(eParts, parts);
      parts.push(`where ${orParts.join(' or ')}`);
      this.appendProjectAway(eParts, parts);
    }

    if (isFieldAndOperator(expression)) {
      return this.appendOperator(expression, parts, eParts, prefix);
    }
  }

  private appendSummarize(
    context: ParseContext,
    reduce: QueryEditorArrayExpression | undefined,
    groupBy: QueryEditorArrayExpression | undefined,
    parts: string[]
  ) {
    let countAddedInReduce = false;
    const reduceParts: string[] = [];
    const groupByParts: string[] = [];
    const expandParts: string[] = [];
    const columns: string[] = [];

    for (const expression of reduce?.expressions ?? []) {
      if (!isReduceExpression(expression)) {
        continue;
      }

      const func = expression.reduce.name;
      const parameters = expression.parameters;
      const name = this.addExpanPartsdIfNeeded(expression.property.name, expandParts);
      const column = context.castIfDynamic(name, expression.property.name);
      columns.push(column);

      if (Array.isArray(parameters)) {
        const funcParams = parameters.map((p) => this.formatValue(p.value, p.fieldType)).join(', ');
        reduceParts.push(`${func}(${column}, ${funcParams})`);
        continue;
      }

      if (func === 'count') {
        if (!countAddedInReduce) {
          countAddedInReduce = true;
          reduceParts.push('count()');
        }
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

      const name = this.addExpanPartsdIfNeeded(expression.property.name, expandParts);
      const column = context.castIfDynamic(name, expression.property.name);

      if (expression.interval) {
        const interval = expression.interval.name;
        groupByParts.unshift(`bin(${column}, ${interval})`);
        continue;
      }

      groupByParts.push(column);
    }

    this.appendMvExpand(expandParts, parts);

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
    expression: QueryEditorOperatorExpression,
    parts: string[],
    expandParts: string[],
    prefix?: string
  ) {
    const { property, operator } = expression;

    if (!property.name || !operator.name) {
      return;
    }
    const propertyName = escapeColumn(property.name);

    switch (operator.name) {
      case 'isnotempty':
        parts.push(withPrefix(`${operator.name}(${propertyName})`, prefix));
        break;

      default:
        const value = this.formatValue(operator.value, property.type);
        const name = this.addExpanPartsdIfNeeded(propertyName, expandParts);
        parts.push(withPrefix(`${name} ${operator.name} ${value}`, prefix));
        break;
    }
  }

  private formatValue(value: any, type: QueryEditorPropertyType): string {
    if (Array.isArray(value)) {
      return `(${value.map((v) => this.formatValue(v, type)).join(', ')})`;
    }

    const val = typeof value === 'object' ? value.value : value;
    if (this.isTemplateVariable(val)) {
      return val;
    }

    switch (type) {
      case QueryEditorPropertyType.Number:
      case QueryEditorPropertyType.Boolean:
        return val;
      default:
        return `'${val}'`;
    }
  }

  private addExpanPartsdIfNeeded(name: string, parts: string[]) {
    if (name.includes(DYNAMIC_TYPE_ARRAY_DELIMITER)) {
      const arrayElemParts = name.split(DYNAMIC_TYPE_ARRAY_DELIMITER);
      const arrayLength = parts.push(arrayElemParts[0]);
      const res = name.replace(`${parts[arrayLength - 1]}${DYNAMIC_TYPE_ARRAY_DELIMITER}`, `array_${arrayLength}`);
      if (res.includes(DYNAMIC_TYPE_ARRAY_DELIMITER)) {
        return this.addExpanPartsdIfNeeded(res, parts);
      }
      return res;
    }
    return name;
  }

  private appendMvExpand(expandParts: string[], parts: string[]) {
    expandParts.forEach((p, i) => parts.push(`mv-expand array_${i + 1} = ${p}`));
  }

  private appendProject(columns: string[] | undefined, parts: string[]) {
    if (columns?.length) {
      parts.push(`project ${columns.map(escapeColumn).join(', ')}`);
    }
  }

  private appendProjectAway(expandParts: string[], parts: string[]) {
    if (expandParts.length) {
      // mv-expand creates a new column that we need to delete from the result
      const arrayCols = expandParts.map((p, i) => `array_${i + 1}`);
      parts.push(`project-away ${arrayCols.join(', ')}`);
    }
  }

  private appendProperty(context: ParseContext, expression: QueryEditorPropertyExpression, parts: string[]) {
    parts.push(this.formatProperty(expression.property.name));
  }

  private formatProperty(property: string): string {
    const specialCharacters = /[\s\.-]/; // space, dot, or dash
    const schemaMappingCharacters = /[\$\(]/; // $ or (

    if (specialCharacters.test(property) && !schemaMappingCharacters.test(property)) {
      return `['${property}']`;
    }

    return property;
  }

  private isTemplateVariable(value: string | SelectableValue<string>): boolean {
    if (!Array.isArray(this.templateSrv.getVariables())) {
      return false;
    }

    const val = typeof value === 'string' ? value : value.value || '';

    return !!this.templateSrv.getVariables().find((variable: any) => {
      return `$${variable?.id}` === val || `'$${variable?.id}'` === val || val.startsWith(`\$\{${variable?.id}:`);
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
  if (Array.isArray(expression?.groupBy.expressions) && expression?.groupBy.expressions.length) {
    const groupByTimeColumn = expression?.groupBy.expressions.find((exp) => {
      if (!isGroupBy(exp)) {
        return false;
      }
      return exp.property.type === QueryEditorPropertyType.DateTime && exp.interval;
    });

    if (isGroupBy(groupByTimeColumn)) {
      return escapeAndCastIfDynamic(groupByTimeColumn.property.name, columns);
    }
  }

  if (!Array.isArray(columns)) {
    return;
  }

  const firstLevelColumn = columns?.find((col) => {
    return col.CslType === 'datetime' && col.Name.indexOf('[') === -1;
  });

  if (firstLevelColumn) {
    return firstLevelColumn?.Name;
  }

  const column = columns?.find((col) => col.CslType === 'datetime');

  if (!column) {
    return column;
  }

  return toType(column.CslType, column.Name);
};

const escapeAndCastIfDynamic = (column: string, tableSchema?: AdxColumnSchema[], schemaName?: string): string => {
  const columnSchema = tableSchema?.find((c) => c.Name === (schemaName || column));

  if (!columnSchema?.isDynamic || !Array.isArray(tableSchema)) {
    return escapeColumn(column);
  }

  if (!columnSchema) {
    return escapeColumn(column);
  }

  return toType(columnSchema.CslType, column);
};

const toType = (type: string, name: string): string => {
  return `to${type}(${escapeColumn(name)})`;
};

const replaceByIndex = (
  index: string,
  expression: QueryEditorArrayExpression,
  operator: QueryEditorOperatorExpression
): QueryEditorArrayExpression => {
  const keys = index.split('-').map((n) => parseInt(n, 10));

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

const isValidTimeSpan = (value: string) => {
  return /^(\d{1,15}(?:d|h|ms|s|m){0,1})$/gm.test(value);
};

const detectTimeshift = (
  context: ParseContext,
  timeshift: QueryEditorPropertyExpression | undefined
): string | null => {
  if (!timeshift || !context.timeColumn || !timeshift.property) {
    return null;
  }

  const timeshiftWith = timeshift.property.name;

  if (!isValidTimeSpan(timeshiftWith)) {
    return null;
  }
  return timeshiftWith;
};
