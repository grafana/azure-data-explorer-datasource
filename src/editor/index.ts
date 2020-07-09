import React from 'react';
import { QueryEditorSectionBuilder } from './builders/QueryEditorSectionBuilder';
import { QueryEditorSectionProps } from './components/QueryEditorSection';
export { QueryEditorFieldDefinition, QueryEditorFieldType } from './types';

export const buildQueryEditorSection = (
  builder: (builder: QueryEditorSectionBuilder) => React.FC<QueryEditorSectionProps>
): React.FC<QueryEditorSectionProps> => builder(new QueryEditorSectionBuilder());
