import React from 'react';
import { QueryEditorFilterSectionProps, QueryEditorFilterSection } from '../components/filter/QueryEditorFilterSection';
import { QueryEditorOperatorDefinition, QueryEditorPropertyType, QueryEditorProperty } from '../types';
import { QueyEditorOperatorBuilder } from './QueryEditorOperatorBuilder';
import { QueryEditorOperatorExpression, QueryEditorExpressionType } from '../expressions';
import { definitionToOperator } from '../components/operators/QueryEditorOperator';

export class QueryEditorFilterBuilder {
  private operators: QueryEditorOperatorDefinition[];
  //private multipleRows: boolean;

  constructor() {
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

  private buildOperatorExpression(): QueryEditorOperatorExpression {
    const operator = this.operators[0];

    return {
      type: QueryEditorExpressionType.Operator,
      property: this.buildFieldExpression(),
      operator: definitionToOperator(operator),
    };
  }

  // private buildRepeaterExpression(typeToRepeat: QueryEditorExpressionType): QueryEditorRepeaterExpression {
  //   return {
  //     type: QueryEditorExpressionType.OperatorRepeater,
  //     typeToRepeat: typeToRepeat,
  //     expressions: [],
  //   };
  // }

  private buildFieldExpression(): QueryEditorProperty {
    return {
      name: '',
      type: QueryEditorPropertyType.String,
    };
  }
}
