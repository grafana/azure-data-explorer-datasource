import { AdxQueryType, defaultQuery, EditorMode } from 'types';
import { migrateAnnotation } from './annotation';

const OLD_ANNOTATION = {
  database: 'PerfTest',
  datasource: null,
  enable: true,
  iconColor: 'red',
  name: 'New annotation',
  query: 'PerfTest\n| where $__timeFilter(_Timestamp_) and _val1_ > 15\n| project _Timestamp_, Text=_flag1_',
  resultFormat: 'table',
};

const NEW_ANNOTATION = {
  database: 'PerfTest',
  datasource: null,
  enable: true,
  iconColor: 'red',
  name: 'New annotation',
  query: 'PerfTest\n| where $__timeFilter(_Timestamp_) and _val1_ > 15\n| project _Timestamp_, Text=_flag1_',
  resultFormat: 'table',
  target: {
    database: 'PerfTest',
    expression: defaultQuery.expression,
    pluginVersion: defaultQuery.pluginVersion,
    query: 'PerfTest\n| where $__timeFilter(_Timestamp_) and _val1_ > 15\n| project _Timestamp_, Text=_flag1_',
    querySource: EditorMode.Raw,
    rawMode: true,
    refId: 'Anno',
    resultFormat: 'table',
    queryType: AdxQueryType.KustoQuery,
    clusterUri: '',
  },
};

describe('migrateAnnotation', () => {
  it('migrates old annotations', () => {
    const migrated = migrateAnnotation(OLD_ANNOTATION);
    expect(migrated).toEqual(NEW_ANNOTATION);
  });

  it('passes through already migrated queries untouched', () => {
    const newAnnotation = { ...NEW_ANNOTATION };
    const migrated = migrateAnnotation(newAnnotation);

    // We use .toBe because we want to assert that the object identity did not change!!!
    expect(migrated).toBe(newAnnotation);
  });
});
