import {
  buildFieldQueryEditorSection,
  buildFilterQueryEditorSection,
  buildReduceQueryEditorSection,
  buildGroupByQueryEditorSection,
} from './editor';

import { QueryEditorFieldType } from './editor/types';

export const KustoFromEditorSection = buildFieldQueryEditorSection(fieldSection => fieldSection.build('from'));

export const KustoWhereEditorSection = buildFilterQueryEditorSection(filterSection =>
  filterSection
    .withOperators(operator => {
      operator('in')
        .supportTypes([QueryEditorFieldType.String, QueryEditorFieldType.Number])
        .withDescription('in (case-sensitive)')
        .multipleValues(true)
        .add();

      operator('in~')
        .supportTypes([QueryEditorFieldType.String, QueryEditorFieldType.Number])
        .withDescription('in (case-insensitive)')
        .add();

      operator('!in')
        .supportTypes([QueryEditorFieldType.String, QueryEditorFieldType.Number])
        .withDescription('not in (case-sensitive)')
        .multipleValues(true)
        .add();

      operator('!in~')
        .supportTypes([QueryEditorFieldType.String, QueryEditorFieldType.Number])
        .withDescription('not in (case-insensitive)')
        .multipleValues(true)
        .add();

      operator('==')
        .supportTypes([QueryEditorFieldType.Boolean])
        .withDescription('equal to')
        .booleanValues(true)
        .add();

      operator('!=')
        .supportTypes([QueryEditorFieldType.Boolean])
        .withDescription('not equal to')
        .booleanValues(true)
        .add();
    })
    .withMultipleRows(true)
    .build('where')
);

export const KustoValueColumnEditorSection = buildReduceQueryEditorSection(reduceSection =>
  reduceSection
    .withFunctions(functions => {
      functions('sum')
        .withLabel('Sum')
        .add();

      functions('avg')
        .withLabel('Avg')
        .add();

      functions('count')
        .withLabel('Count')
        .add();

      functions('max')
        .withLabel('Max')
        .add();

      functions('min')
        .withLabel('Min')
        .add();

      functions('none')
        .withLabel('None')
        .add();
    })
    .withMultipleRows(true)
    .build('value-column')
);

export const KustoGroupByEditorSection = buildGroupByQueryEditorSection(groupBySection =>
  groupBySection
    .withIntervals(intervals => {
      intervals('$__interval')
        .withLabel('auto')
        .add();
      intervals('1m')
        .withLabel('1 minute')
        .add();

      intervals('5m')
        .withLabel('5 minutes')
        .add();

      intervals('15m')
        .withLabel('15 minutes')
        .add();

      intervals('30m')
        .withLabel('30 minutes')
        .add();

      intervals('1h')
        .withLabel('1 hour')
        .add();

      intervals('6h')
        .withLabel('6 hours')
        .add();

      intervals('12h')
        .withLabel('12 hours')
        .add();

      intervals('1d')
        .withLabel('1 day')
        .add();
    })
    .withMultipleRows(true)
    .build('group-by')
);
