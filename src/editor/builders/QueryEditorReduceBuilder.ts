import React from 'react';
import { QueryEditorFunctionDefinition, QueryEditorFieldType } from '../types';
import { QueryEditorFieldExpression } from '../components/field/QueryEditorField';
import { QueryEditorReduceSection, QueryEditorReduceSectionProps } from '../components/reduce/QueryEditorReduceSection';
import { QueryEditorFunctionBuilder } from './QueryEditorFunctionBuilder';
import { QueryEditorExpression, QueryEditorExpressionType } from '../../types';
import { QueryEditorRepeaterExpression } from '../components/QueryEditorRepeater';
import { QueryEditorReduceExpression } from '../components/reduce/QueryEditorReduce';

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

  build(id: string): React.FC<QueryEditorReduceSectionProps> {
    return QueryEditorReduceSection({
      id,
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

    return this.buildFieldExpression(QueryEditorFieldType.String);
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
      field: this.buildFieldExpression(QueryEditorFieldType.String),
      reduce: this.buildFieldExpression(QueryEditorFieldType.Function),
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
