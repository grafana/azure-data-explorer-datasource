import React from 'react';
import { QueryEditorFieldType } from '../types';
import { QueryEditorFieldSectionProps, QueryEditorFieldSection } from 'editor/components/field/QueryEditorFieldSection';
import { QueryEditorFieldExpression, QueryEditorExpressionType } from '../expressions';

export class QueryEditorFieldBuilder {
  build(id: string): React.FC<QueryEditorFieldSectionProps> {
    return QueryEditorFieldSection({
      id,
      expression: this.buildFieldExpression(),
    });
  }

  private buildFieldExpression(): QueryEditorFieldExpression {
    return {
      type: QueryEditorExpressionType.Field,
      value: '',
      fieldType: QueryEditorFieldType.String,
    };
  }
}
