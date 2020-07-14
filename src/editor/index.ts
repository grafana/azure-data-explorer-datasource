import React from 'react';
import { QueryEditorFilterSectionProps } from './components/filter/QueryEditorFilterSection';
import { QueryEditorFieldSectionProps } from './components/field/QueryEditorFieldSection';
import { QueryEditorFieldBuilder } from './builders/QueryEditorFieldBuilder';
import { QueryEditorFilterBuilder } from './builders/QueryEditorFilterBuilder';
import { QueryEditorReduceSectionProps } from './components/reduce/QueryEditorReduceSection';
import { QueryEditorReduceBuilder } from './builders/QueryEditorReduceBuilder';

export const buildFieldQueryEditorSection = (
  builder: (builder: QueryEditorFieldBuilder) => React.FC<QueryEditorFieldSectionProps>
): React.FC<QueryEditorFieldSectionProps> => builder(new QueryEditorFieldBuilder());

export const buildFilterQueryEditorSection = (
  builder: (builder: QueryEditorFilterBuilder) => React.FC<QueryEditorFilterSectionProps>
): React.FC<QueryEditorFilterSectionProps> => builder(new QueryEditorFilterBuilder());

export const buildReduceQueryEditorSection = (
  builder: (builder: QueryEditorReduceBuilder) => React.FC<QueryEditorReduceSectionProps>
): React.FC<QueryEditorReduceSectionProps> => builder(new QueryEditorReduceBuilder());
