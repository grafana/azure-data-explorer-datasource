import React from 'react';
import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from '../types';
import {
  QueryEditorGroupBySection,
  QueryEditorGroupBySectionProps,
} from '../components/groupBy/QueryEditorGroupBySection';
import { QueryEditorIntervalBuilder } from './QueryEditorIntervalBuilder';
import { QueryEditorGroupByExpression, QueryEditorExpressionType } from '../expressions';

export class QueryEditorGroupByBuilder {
  private intervals: QueryEditorPropertyDefinition[];

  constructor() {
    this.intervals = [];
  }

  withMultipleRows(value: boolean) {
    return this;
  }

  withIntervals(intervals: (builder: (value: string) => QueryEditorIntervalBuilder) => void) {
    intervals((value) => new QueryEditorIntervalBuilder(value, this.intervals));
    return this;
  }

  build(): React.FC<QueryEditorGroupBySectionProps> {
    return QueryEditorGroupBySection({
      intervals: this.intervals,
      defaultValue: this.buildGroupByExpressions(),
    });
  }

  private buildGroupByExpressions(): QueryEditorGroupByExpression {
    return {
      type: QueryEditorExpressionType.GroupBy,
      property: {
        name: '',
        type: QueryEditorPropertyType.String,
      },
    };
  }
}
