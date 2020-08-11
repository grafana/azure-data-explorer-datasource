import React from 'react';
import { QueryEditorFunctionDefinition, QueryEditorPropertyType, QueryEditorProperty } from '../types';
import { QueryEditorReduceSection, QueryEditorReduceSectionProps } from '../components/reduce/QueryEditorReduceSection';
import { QueryEditorFunctionBuilder } from './QueryEditorFunctionBuilder';
import {
  QueryEditorRepeaterExpression,
  QueryEditorReduceExpression,
  QueryEditorPropertyExpression,
  QueryEditorExpression,
  QueryEditorExpressionType,
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
      property: this.buildProperty(QueryEditorPropertyType.String),
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
