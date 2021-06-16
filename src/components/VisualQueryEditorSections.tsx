import {
  buildFieldQueryEditorSection,
  buildFilterQueryEditorSection,
  buildReduceQueryEditorSection,
  buildGroupByQueryEditorSection,
} from '../editor';

import { QueryEditorPropertyType } from '../editor/types';

export const KustoPropertyEditorSection = buildFieldQueryEditorSection((fieldSection) => fieldSection.build());

export const KustoWhereEditorSection = buildFilterQueryEditorSection((filterSection) =>
  filterSection
    .withOperators((operator) => {
      operator('==')
        .supportTypes([
          QueryEditorPropertyType.String,
          QueryEditorPropertyType.Number,
          QueryEditorPropertyType.DateTime,
        ])
        .withDescription('equal to')
        .add();

      operator('==')
        .supportTypes([QueryEditorPropertyType.Boolean])
        .withDescription('equal to')
        .booleanValues(true)
        .add();

      operator('!=')
        .supportTypes([
          QueryEditorPropertyType.String,
          QueryEditorPropertyType.Number,
          QueryEditorPropertyType.DateTime,
        ])
        .withDescription('not equal to')
        .add();

      operator('!=')
        .supportTypes([QueryEditorPropertyType.Boolean])
        .withDescription('not equal to')
        .booleanValues(true)
        .add();

      operator('>')
        .supportTypes([QueryEditorPropertyType.Number, QueryEditorPropertyType.DateTime])
        .withDescription('greater than')
        .add();

      operator('<')
        .supportTypes([QueryEditorPropertyType.Number, QueryEditorPropertyType.DateTime])
        .withDescription('less than')
        .add();

      operator('=~')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('equal to (case-insensitive)')
        .add();

      operator('!~')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('not equal to (case-insensitive)')
        .add();

      operator('in')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('in (case-sensitive)')
        .multipleValues(true)
        .add();

      operator('in~')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('in (case-insensitive)')
        .multipleValues(true)
        .add();

      operator('!in')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('not in (case-sensitive)')
        .multipleValues(true)
        .add();

      operator('!in~')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('not in (case-insensitive)')
        .multipleValues(true)
        .add();

      operator('contains')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('contains substring')
        .multipleValues(false)
        .add();

      operator('!contains')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('does not contain substring')
        .multipleValues(false)
        .add();

      operator('contains_cs')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('contains substring (case-sensitive)')
        .multipleValues(false)
        .add();

      operator('!contains_cs')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('does not contain substring (case-sensitive)')
        .multipleValues(false)
        .add();

      operator('endswith')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('ends with')
        .multipleValues(false)
        .add();

      operator('!endswith')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('does not end with')
        .multipleValues(false)
        .add();

      operator('endswith_cs')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('ends with (case-sensitive)')
        .multipleValues(false)
        .add();

      operator('!endswith_cs')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('does not end with (case-sensitive)')
        .multipleValues(false)
        .add();

      operator('startswith')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('starts with')
        .multipleValues(false)
        .add();

      operator('!startsswith')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('does not start with')
        .multipleValues(false)
        .add();

      operator('startswith_cs')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('starts with (case-sensitive)')
        .multipleValues(false)
        .add();

      operator('!startswith_cs')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('does not start with (case-sensitive)')
        .multipleValues(false)
        .add();

      operator('matches regex')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('regex string matching')
        .multipleValues(false)
        .add();

      operator('has_any')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('any provided values matching')
        .multipleValues(true)
        .add();

      operator('has')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('match if whole term exists in column')
        .multipleValues(false)
        .add();

      operator('!has')
        .supportTypes([QueryEditorPropertyType.String])
        .withDescription('match if whole term not exists in column')
        .multipleValues(false)
        .add();
    })
    .withMultipleRows(true)
    .build()
);

export const KustoValueColumnEditorSection = buildReduceQueryEditorSection((reduceSection) =>
  reduceSection
    .withFunctions((functions) => {
      functions('sum').withLabel('Sum').add();

      functions('avg').withLabel('Avg').add();

      functions('count').isAppliedOnField(false).withLabel('Count').add();

      functions('dcount').withLabel('Dcount').add();

      functions('max').withLabel('Max').add();

      functions('min').withLabel('Min').add();

      functions('percentile')
        .withLabel('Percentile')
        .withParameter('percentileParam', QueryEditorPropertyType.Number, 'percentile constant')
        .add();
    })
    .withMultipleRows(true)
    .build()
);

export const KustoGroupByEditorSection = buildGroupByQueryEditorSection((groupBySection) =>
  groupBySection
    .withIntervals((intervals) => {
      intervals('$__timeInterval').withLabel('auto').add();
      intervals('1m').withLabel('1 minute').add();

      intervals('5m').withLabel('5 minutes').add();

      intervals('15m').withLabel('15 minutes').add();

      intervals('30m').withLabel('30 minutes').add();

      intervals('1h').withLabel('1 hour').add();

      intervals('6h').withLabel('6 hours').add();

      intervals('12h').withLabel('12 hours').add();

      intervals('1d').withLabel('1 day').add();
    })
    .withMultipleRows(true)
    .build()
);
