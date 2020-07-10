import React from 'react';
import { QueryEditorFilterSectionProps } from './components/QueryEditorFilterSection';
import { QueryEditorFieldSectionProps } from './components/field/QueryEditorFieldSection';
import { QueryEditorFieldBuilder } from './builders/QueryEditorFieldBuilder';
import { QueryEditorFilterBuilder } from './builders/QueryEditorFilterBuilder';
export { QueryEditorFieldDefinition, QueryEditorFieldType } from './types';

export const buildFieldQueryEditorSection = (
  builder: (builder: QueryEditorFieldBuilder) => React.FC<QueryEditorFieldSectionProps>
): React.FC<QueryEditorFieldSectionProps> => builder(new QueryEditorFieldBuilder());

export const buildFilterQueryEditorSection = (
  builder: (builder: QueryEditorFilterBuilder) => React.FC<QueryEditorFilterSectionProps>
): React.FC<QueryEditorFilterSectionProps> => builder(new QueryEditorFilterBuilder());
