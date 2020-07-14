import React from 'react';
import { QueryEditorFieldType, QueryEditorFieldDefinition } from '../types';
import { QueryEditorFieldExpression } from '../components/field/QueryEditorField';
import { QueryEditorReduceSectionProps, QueryEditorReduceSection } from '../components/reduce/QueryEditorReduceSection';
import { QueryEditorReduceExpression } from 'editor/components/reduce/QueryEditorReduce';
import { QueryEditorFunctionBuilder } from './QueryEditorFunctionBuilder';
import { QueryEditorExpressionType } from '../../types';

export class QueryEditorReduceBuilder {
  private functions: QueryEditorFieldDefinition[];
  // private multipleRows: boolean = false;

  constructor() {
    this.functions = [];
    // this.multipleRows = false;
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

  private buildReduceExpression(): QueryEditorReduceExpression {
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
