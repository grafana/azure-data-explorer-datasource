import React from 'react';
import { QueryEditorFunctionDefinition, QueryEditorPropertyType, QueryEditorProperty } from '../types';
import { QueryEditorReduceSection, QueryEditorReduceSectionProps } from '../components/reduce/QueryEditorReduceSection';
import { QueryEditorFunctionBuilder } from './QueryEditorFunctionBuilder';
import { QueryEditorReduceExpression, QueryEditorExpressionType } from '../expressions';

export class QueryEditorReduceBuilder {
  private functions: QueryEditorFunctionDefinition[];

  constructor() {
    this.functions = [];
  }

  withMultipleRows(value: boolean) {
    return this;
  }

  withFunctions(functions: (builder: (value: string) => QueryEditorFunctionBuilder) => void) {
    functions((value) => new QueryEditorFunctionBuilder(value, this.functions));
    return this;
  }

  build(): React.FC<QueryEditorReduceSectionProps> {
    return QueryEditorReduceSection({
      functions: this.functions,
      defaultValue: this.buildReduceExpression(),
    });
  }

  private buildReduceExpression(): QueryEditorReduceExpression {
    return {
      type: QueryEditorExpressionType.Reduce,
      property: this.buildProperty(QueryEditorPropertyType.String),
      reduce: this.buildProperty(QueryEditorPropertyType.Function),
    };
  }

  private buildProperty(type: QueryEditorPropertyType): QueryEditorProperty {
    return {
      name: '',
      type,
    };
  }
}
