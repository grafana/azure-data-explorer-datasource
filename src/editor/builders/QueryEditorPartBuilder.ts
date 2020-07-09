import React from 'react';
import { QueryEditorSection, QueryEditorPartProps } from '../components/QueryEditorSection';
import { QueyEditorOperatorBuilder } from './QueryEditorOperatorBuilder';
import { QueryEditorOperatorDefinition, QueryEditorCondition } from '../types';

export class QueryEditorPartBuilder {
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

  build(id: string): React.FC<QueryEditorPartProps> {
    return QueryEditorSection({
      id,
      operators: this.operators,
      conditionals: this.conditionals,
      multipleRows: this.multipleRows,
    });
  }
}
