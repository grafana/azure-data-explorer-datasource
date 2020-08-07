import React from 'react';
import { QueryEditorFunctionDefinition, QueryEditorFieldType } from '../types';
import { QueryEditorReduceSection, QueryEditorReduceSectionProps } from '../components/reduce/QueryEditorReduceSection';
import { QueryEditorFunctionBuilder } from './QueryEditorFunctionBuilder';
import {
  QueryEditorRepeaterExpression,
  QueryEditorReduceExpression,
  QueryEditorPropertyExpression,
  QueryEditorExpression,
  QueryEditorExpressionType,
  QueryEditorProperty,
} from '../expressions';

export class QueryEditorReduceBuilder {
  private functions: QueryEditorFunctionDefinition[];
  private multipleRows = false;

  constructor() {
    this.functions = [];
    this.multipleRows = false;
  }

  withMultipleRows(value: boolean) {
    this.multipleRows = value;
    return this;
  }

  withFunctions(functions: (builder: (value: string) => QueryEditorFunctionBuilder) => void) {
    functions(value => new QueryEditorFunctionBuilder(value, this.functions));
    return this;
  }

  build(): React.FC<QueryEditorReduceSectionProps> {
    return QueryEditorReduceSection({
      functions: this.functions,
      defaultValue: this.buildReduceExpression(),
    });
  }

  private buildReduceExpression(): QueryEditorExpression {
    if (this.multipleRows) {
      if (this.functions.length > 0) {
        return this.buildRepeaterExpression(QueryEditorExpressionType.Reduce);
      }
      return this.buildRepeaterExpression(QueryEditorExpressionType.Field);
    }

    if (this.functions.length > 0) {
      return this.buildReduceFnExpression();
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

  private buildReduceFnExpression(): QueryEditorReduceExpression {
    return {
      type: QueryEditorExpressionType.Reduce,
      property: this.buildProperty(QueryEditorFieldType.String),
      reduce: this.buildProperty(QueryEditorFieldType.Function),
    };
  }

  private buildProperty(type: QueryEditorFieldType): QueryEditorProperty {
    return {
      name: '',
      type,
    };
  }
}
