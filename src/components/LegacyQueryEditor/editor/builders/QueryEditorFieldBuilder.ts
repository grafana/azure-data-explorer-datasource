import React from 'react';
import { QueryEditorPropertyType } from '../../../../schema/types';
import {
  QueryEditorFieldSectionProps,
  QueryEditorFieldSection,
} from 'components/LegacyQueryEditor/editor/components/field/QueryEditorFieldSection';
import { QueryEditorPropertyExpression, QueryEditorExpressionType } from '../expressions';

export class QueryEditorFieldBuilder {
  build(): React.FC<QueryEditorFieldSectionProps> {
    return QueryEditorFieldSection({
      defaultValue: this.buildFieldExpression(),
    });
  }

  private buildFieldExpression(): QueryEditorPropertyExpression {
    return {
      type: QueryEditorExpressionType.Property,
      property: {
        name: '',
        type: QueryEditorPropertyType.String,
      },
    };
  }
}
