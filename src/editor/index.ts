import React from 'react';
import { QueryEditorSectionBuilder } from './builders/QueryEditorSectionBuilder';
import { QueryEditorPartProps } from './components/QueryEditorSection';
export { QueryEditorFieldDefinition, QueryEditorFieldType } from './types';

export const buildQueryEditorSection = (
  builder: (builder: QueryEditorSectionBuilder) => React.FC<QueryEditorPartProps>
): React.FC<QueryEditorPartProps> => builder(new QueryEditorSectionBuilder());
