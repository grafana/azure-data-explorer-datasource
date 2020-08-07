import React from 'react';
import { QueryEditorFieldDefinition, QueryEditorFieldType, QueryEditorProperty } from '../types';
import {
  QueryEditorGroupBySection,
  QueryEditorGroupBySectionProps,
} from '../components/groupBy/QueryEditorGroupBySection';
import { QueryEditorIntervalBuilder } from './QueryEditorIntervalBuilder';
import {
  QueryEditorRepeaterExpression,
  QueryEditorGroupByExpression,
  QueryEditorPropertyExpression,
  QueryEditorExpression,
  QueryEditorExpressionType,
} from '../expressions';

export class QueryEditorGroupByBuilder {
  private intervals: QueryEditorFieldDefinition[];
  private multipleRows = false;

  constructor() {
    this.intervals = [];
    this.multipleRows = false;
  }

  withMultipleRows(value: boolean) {
    this.multipleRows = value;
    return this;
  }

  withIntervals(intervals: (builder: (value: string) => QueryEditorIntervalBuilder) => void) {
    intervals(value => new QueryEditorIntervalBuilder(value, this.intervals));
    return this;
  }

  build(): React.FC<QueryEditorGroupBySectionProps> {
    return QueryEditorGroupBySection({
      intervals: this.intervals,
      defaultValue: this.buildGroupByExpressions(),
    });
  }

  private buildGroupByExpressions(): QueryEditorExpression {
    if (this.multipleRows) {
      if (this.intervals.length > 0) {
        return this.buildRepeaterExpression(QueryEditorExpressionType.GroupBy);
      }
      return this.buildRepeaterExpression(QueryEditorExpressionType.Field);
    }

    if (this.intervals.length > 0) {
      return this.buildGroupByExpression();
    }

    return {
      type: QueryEditorExpressionType.Field,
      property: this.buildProperty(QueryEditorFieldType.String),
    } as QueryEditorPropertyExpression;
  }

  private buildRepeaterExpression(typeToRepeat: QueryEditorExpressionType): QueryEditorRepeaterExpression {
    return {
      type: QueryEditorExpressionType.OperatorRepeater,
      typeToRepeat: typeToRepeat,
      expressions: [],
    };
  }

  private buildGroupByExpression(): QueryEditorGroupByExpression {
    return {
      type: QueryEditorExpressionType.GroupBy,
      property: this.buildProperty(QueryEditorFieldType.String),
      interval: this.buildProperty(QueryEditorFieldType.Interval),
    };
  }

  private buildProperty(type: QueryEditorFieldType): QueryEditorProperty {
    return {
      name: '',
      type,
    };
  }
}
