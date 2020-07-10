import React from 'react';
import { QueryEditorFieldExpression } from '../components/QueryEditorField';
import { QueryEditorExpressionType } from '../components/types';
import { QueryEditorFieldType } from '../types';
import { QueryEditorFieldSectionProps, QueryEditorFieldSection } from 'editor/components/QueryEditorFieldSection';

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
