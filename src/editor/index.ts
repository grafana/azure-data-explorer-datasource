import React from 'react';
import { QueryEditorPartBuilder } from './builders/QueryEditorPartBuilder';
import { QueryEditorPartProps } from './components/QueryEditorSection';
export { QueryEditorFieldDefinition, QueryEditorFieldType } from './types';

export const buildQueryEditorPart = (
  builder: (builder: QueryEditorPartBuilder) => React.FC<QueryEditorPartProps>
): React.FC<QueryEditorPartProps> => builder(new QueryEditorPartBuilder());
