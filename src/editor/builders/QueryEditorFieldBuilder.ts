import React from 'react';
import { QueryEditorPropertyType } from '../types';
import { QueryEditorFieldSectionProps, QueryEditorFieldSection } from 'editor/components/field/QueryEditorFieldSection';
import { QueryEditorPropertyExpression, QueryEditorExpressionType } from '../expressions';

export class QueryEditorFieldBuilder {
  build(): React.FC<QueryEditorFieldSectionProps> {
    return QueryEditorFieldSection({
      defaultValue: this.buildFieldExpression(),
    });
  }

  private buildFieldExpression(): QueryEditorPropertyExpression {
    return {
      type: QueryEditorExpressionType.Field,
      property: {
        name: '',
        type: QueryEditorPropertyType.String,
      },
    };
  }
}
