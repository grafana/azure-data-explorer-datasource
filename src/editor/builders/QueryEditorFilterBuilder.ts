import React from 'react';
import { QueryEditorFilterSectionProps, QueryEditorFilterSection } from '../components/filter/QueryEditorFilterSection';
import { QueryEditorOperatorDefinition, QueryEditorCondition, QueryEditorFieldType } from '../types';
import { QueyEditorOperatorBuilder } from './QueryEditorOperatorBuilder';
import {
  QueryEditorFieldAndOperatorExpression,
  QueryEditorRepeaterExpression,
  QueryEditorFieldExpression,
  QueryEditorExpression,
  QueryEditorExpressionType,
} from '../expressions';

export class QueryEditorFilterBuilder {
  private operators: QueryEditorOperatorDefinition[];
  private conditionals: QueryEditorCondition[];
  //private multipleRows: boolean;

  constructor() {
    this.conditionals = [];
    this.operators = [];
    // this.multipleRows = false;
  }

  withOperators(operators: (builder: (value: string) => QueyEditorOperatorBuilder) => void) {
    operators(value => new QueyEditorOperatorBuilder(value, this.operators));
    return this;
  }

  withMultipleRows(value: boolean) {
    // this.multipleRows = value;
    return this;
  }

  build(): React.FC<QueryEditorFilterSectionProps> {
    return QueryEditorFilterSection({
      operators: this.operators,
      conditionals: this.conditionals,
      defaultValue: this.buildOperatorExpression(),
    });
  }

  // protected buildFilterExpression(): QueryEditorFieldAndOperatorExpression {
  //   // if (this.multipleRows) {
  //   //   if (this.operators.length > 0) {
  //   //     return this.buildRepeaterExpression(QueryEditorExpressionType.FieldAndOperator);
  //   //   }
  //   //   return this.buildRepeaterExpression(QueryEditorExpressionType.Field);
  //   // }
  //   // if (this.operators.length > 0) {
  //   //   return this.buildOperatorExpression();
  //   // }
  //   // return this.buildFieldExpression();
  // }

  private buildOperatorExpression(): QueryEditorFieldAndOperatorExpression {
    return {
      type: QueryEditorExpressionType.FieldAndOperator,
      field: this.buildFieldExpression(),
      operator: {
        type: QueryEditorExpressionType.Operator,
        operator: this.operators[0],
      },
    };
  }

  // private buildRepeaterExpression(typeToRepeat: QueryEditorExpressionType): QueryEditorRepeaterExpression {
  //   return {
  //     type: QueryEditorExpressionType.OperatorRepeater,
  //     typeToRepeat: typeToRepeat,
  //     expressions: [],
  //   };
  // }

  private buildFieldExpression(): QueryEditorFieldExpression {
    return {
      type: QueryEditorExpressionType.Field,
      value: '',
      fieldType: QueryEditorFieldType.String,
    };
  }
}
