import React from 'react';
import { QueryEditorSection, QueryEditorSectionProps } from '../components/QueryEditorSection';
import { QueyEditorOperatorBuilder } from './QueryEditorOperatorBuilder';
import { QueryEditorOperatorDefinition, QueryEditorCondition } from '../types';

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

  build(id: string): React.FC<QueryEditorSectionProps> {
    return QueryEditorSection({
      id,
      operators: this.operators,
      conditionals: this.conditionals,
      multipleRows: this.multipleRows,
    });
  }
}
