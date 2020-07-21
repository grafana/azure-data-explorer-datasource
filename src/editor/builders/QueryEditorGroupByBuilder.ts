import React from 'react';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from '../types';
import { QueryEditorFieldExpression } from '../components/field/QueryEditorField';
import {
  QueryEditorGroupBySection,
  QueryEditorGroupBySectionProps,
} from '../components/groupBy/QueryEditorGroupBySection';
import { QueryEditorIntervalBuilder } from './QueryEditorIntervalBuilder';
import { QueryEditorExpression, QueryEditorExpressionType } from '../../types';
import { QueryEditorRepeaterExpression } from '../components/QueryEditorRepeater';
import { QueryEditorGroupByExpression } from '../components/groupBy/QueryEditorGroupBy';

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

  build(id: string): React.FC<QueryEditorGroupBySectionProps> {
    return QueryEditorGroupBySection({
      id,
      intervals: this.intervals,
      defaultValue: this.buildGroupByExpression(),
    });
  }

  private buildGroupByExpression(): QueryEditorExpression {
    if (this.multipleRows) {
      if (this.intervals.length > 0) {
        return this.buildRepeaterExpression(QueryEditorExpressionType.GroupBy);
      }
      return this.buildRepeaterExpression(QueryEditorExpressionType.Field);
    }

    if (this.intervals.length > 0) {
      return this.buildIntervalExpression();
    }

    return this.buildFieldExpression(QueryEditorFieldType.String);
  }

  private buildRepeaterExpression(typeToRepeat: QueryEditorExpressionType): QueryEditorRepeaterExpression {
    return {
      type: QueryEditorExpressionType.OperatorRepeater,
      typeToRepeat: typeToRepeat,
      expressions: [],
    };
  }

  private buildIntervalExpression(): QueryEditorGroupByExpression {
    return {
      type: QueryEditorExpressionType.GroupBy,
      field: this.buildFieldExpression(QueryEditorFieldType.String),
      interval: this.buildFieldExpression(QueryEditorFieldType.Interval),
    };
  }

  private buildFieldExpression(type: QueryEditorFieldType): QueryEditorFieldExpression {
    return {
      type: QueryEditorExpressionType.Field,
      value: '',
      fieldType: type,
    };
  }
}
