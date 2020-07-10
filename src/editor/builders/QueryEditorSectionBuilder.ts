import React from 'react';
import { QueryEditorSection, QueryEditorSectionProps } from '../components/QueryEditorSection';
import { QueyEditorOperatorBuilder } from './QueryEditorOperatorBuilder';
import { QueryEditorOperatorDefinition, QueryEditorCondition, QueryEditorFieldType } from '../types';
import { QueryEditorExpression, QueryEditorExpressionType } from 'editor/components/types';
import { QueryEditorRepeaterExpression } from 'editor/components/QueryEditorRepeater';
import { QueryEditorFieldAndOperatorExpression } from 'editor/components/QueryEditorFieldAndOperator';
import { QueryEditorFieldExpression } from 'editor/components/QueryEditorField';

export class QueryEditorSectionBuilder {
  private operators: QueryEditorOperatorDefinition[];
  private conditionals: QueryEditorCondition[];
  private multipleRows: boolean;

  constructor() {
    this.operators = [];
    this.conditionals = [];
    this.multipleRows = false;
  }

  withOperators(operators: (builder: (value: string) => QueyEditorOperatorBuilder) => void) {
    operators(value => new QueyEditorOperatorBuilder(value, this.operators));
    return this;
  }

  withMultipleRows(value: boolean) {
    this.multipleRows = value;
    return this;
  }

  build(id: string): React.FC<QueryEditorSectionProps> {
    return QueryEditorSection({
      id,
      operators: this.operators,
      conditionals: this.conditionals,
      expression: this.buildExpression(),
    });
  }

  private buildExpression(): QueryEditorExpression {
    if (this.multipleRows) {
      if (this.operators.length > 0) {
        return this.buildRepeaterExpression(QueryEditorExpressionType.FieldAndOperator);
      }
      return this.buildRepeaterExpression(QueryEditorExpressionType.Field);
    }

    if (this.operators.length > 0) {
      return this.buildOperatorExpression();
    }

    return this.buildFieldExpression();
  }

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

  private buildRepeaterExpression(typeToRepeate: QueryEditorExpressionType): QueryEditorRepeaterExpression {
    return {
      type: QueryEditorExpressionType.OperatorRepeater,
      typeToRepeate: typeToRepeate,
      expressions: [],
    };
  }

  private buildFieldExpression(): QueryEditorFieldExpression {
    return {
      type: QueryEditorExpressionType.Field,
      value: '',
      fieldType: QueryEditorFieldType.String,
    };
  }
}
