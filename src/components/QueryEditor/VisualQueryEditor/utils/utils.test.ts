import { QueryEditorExpressionType } from 'types/expressions';
import { QueryEditorOperator, QueryEditorPropertyType } from 'schema/types';
import { defaultQuery } from 'types';
import { AggregateFunctions } from '../AggregateItem';
import {
  defaultTimeSeriesColumns,
  getOperatorExpressionOptions,
  getOperatorExpressionValue,
  sanitizeAggregate,
  sanitizeGroupBy,
  sanitizeOperator,
  setOperatorExpressionName,
  setOperatorExpressionProperty,
  setOperatorExpressionValue,
} from './utils';

describe('setOperatorExpressionProperty', () => {
  it('should set a property from an empty expression', () => {
    expect(setOperatorExpressionProperty({ index: 0 }, 'ActivityName', QueryEditorPropertyType.String)).toEqual({
      type: QueryEditorExpressionType.Operator,
      property: { name: 'ActivityName', type: QueryEditorPropertyType.String },
      operator: { name: '==', value: '' },
      index: 0,
    });
  });

  it('should keep the operator name if defined', () => {
    expect(
      setOperatorExpressionProperty(
        { operator: { name: '!=', value: 'c' }, index: 0 },
        'ActivityName',
        QueryEditorPropertyType.String
      )
    ).toEqual({
      type: QueryEditorExpressionType.Operator,
      property: { name: 'ActivityName', type: QueryEditorPropertyType.String },
      operator: { name: '!=', value: '' },
      index: 0,
    });
  });

  it('change the operator name if the new type does not support it', () => {
    expect(
      setOperatorExpressionProperty(
        { operator: { name: 'startswith', value: 'c' }, index: 0 },
        'ID',
        QueryEditorPropertyType.Number
      )
    ).toEqual({
      type: QueryEditorExpressionType.Operator,
      property: { name: 'ID', type: QueryEditorPropertyType.Number },
      operator: { name: '==', value: 0 },
      index: 0,
    });
  });
});

describe('setOperatorExpressionName', () => {
  it('should set a expression name (operator)', () => {
    expect(setOperatorExpressionName({ index: 0 }, '!=')).toEqual({
      type: QueryEditorExpressionType.Operator,
      property: { name: '', type: QueryEditorPropertyType.String },
      operator: { name: '!=', value: '' },
      index: 0,
    });
  });

  it('should keep the current comparison value', () => {
    expect(setOperatorExpressionName({ operator: { name: '==', value: 'foo' }, index: 0 }, '!=')).toEqual({
      type: QueryEditorExpressionType.Operator,
      property: { name: '', type: QueryEditorPropertyType.String },
      operator: { name: '!=', value: 'foo' },
      index: 0,
    });
  });

  it('should convert a value to an array', () => {
    expect(setOperatorExpressionName({ operator: { name: '==', value: 'foo' }, index: 0 }, 'in')).toEqual({
      type: QueryEditorExpressionType.Operator,
      property: { name: '', type: QueryEditorPropertyType.String },
      operator: { name: 'in', value: ['foo'] },
      index: 0,
    });
  });

  it('should convert an array to a string', () => {
    expect(setOperatorExpressionName({ operator: { name: 'in', value: ['foo'] }, index: 0 }, '!=')).toEqual({
      type: QueryEditorExpressionType.Operator,
      property: { name: '', type: QueryEditorPropertyType.String },
      operator: { name: '!=', value: 'foo' },
      index: 0,
    });
  });
});

describe('setOperatorExpressionValue', () => {
  it('should set a single value', () => {
    expect(
      setOperatorExpressionValue(
        { property: { type: QueryEditorPropertyType.String, name: 'ActivityName' }, index: 0 },
        { value: 'foo' }
      )
    ).toEqual({
      type: QueryEditorExpressionType.Operator,
      property: { type: QueryEditorPropertyType.String, name: 'ActivityName' },
      operator: { name: '==', value: 'foo' },
      index: 0,
    });
  });

  it('should keep the operator name', () => {
    expect(
      setOperatorExpressionValue(
        {
          property: { type: QueryEditorPropertyType.String, name: 'ActivityName' },
          operator: { name: '!=', value: 'bar' },
          index: 0,
        },
        { value: 'foo' }
      )
    ).toEqual({
      type: QueryEditorExpressionType.Operator,
      property: { type: QueryEditorPropertyType.String, name: 'ActivityName' },
      operator: { name: '!=', value: 'foo' },
      index: 0,
    });
  });

  it('should set an array of values', () => {
    expect(
      setOperatorExpressionValue(
        { property: { type: QueryEditorPropertyType.String, name: 'ActivityName' }, index: 0 },
        [{ value: 'foo' }, { value: 'bar' }]
      )
    ).toEqual({
      type: QueryEditorExpressionType.Operator,
      property: { type: QueryEditorPropertyType.String, name: 'ActivityName' },
      operator: { name: '==', value: ['foo', 'bar'] },
      index: 0,
    });
  });
});

describe('getOperatorExpressionValue', () => {
  it('get the current value', () => {
    expect(getOperatorExpressionValue('foo')).toEqual({ label: 'foo', value: 'foo' });
  });

  it('get the current value', () => {
    const value = [
      { label: 'foo', value: 'foo' },
      { label: 'bar', value: 'bar' },
    ];
    expect(getOperatorExpressionValue(value)).toEqual(value);
  });

  it('remove quotes for single values', () => {
    expect(getOperatorExpressionValue("'$foo'")).toEqual({ label: '$foo', value: '$foo' });
  });
});

describe('getOperatorExpressionOptions', () => {
  const value = [{ label: 'foo', value: 'foo' }];
  it('get the current value', () => {
    expect(getOperatorExpressionOptions(value)).toEqual(value);
  });

  it('parse the current single value as options', () => {
    expect(getOperatorExpressionOptions(undefined, 'foo')).toEqual(value);
  });

  it('parse the current array value as options', () => {
    expect(getOperatorExpressionOptions(undefined, ['foo'])).toEqual(value);
  });
});

describe('sanitizeOperator', () => {
  it('ignores an expression with a missing property name', () => {
    expect(
      sanitizeOperator({
        operator: { name: '==', value: 'foo' },
      })
    ).toBeUndefined();
  });

  it('ignores an expression with a missing operator name', () => {
    expect(
      sanitizeOperator({
        property: { name: 'ID', type: QueryEditorPropertyType.Number },
        operator: { name: '', value: 'foo' },
      })
    ).toBeUndefined();
  });

  it('ignores an expression with a missing operator value', () => {
    expect(
      sanitizeOperator({
        property: { name: 'ID', type: QueryEditorPropertyType.Number },
        operator: { name: '==' } as QueryEditorOperator,
      })
    ).toBeUndefined();
  });

  it('returns a valid operator', () => {
    const op = {
      property: { name: 'ID', type: QueryEditorPropertyType.Number },
      operator: { name: '==', value: 123 },
    };
    expect(sanitizeOperator(op)).toEqual({ type: QueryEditorExpressionType.Operator, ...op });
  });

  it('returns a valid operator (boolean)', () => {
    const op = {
      property: { name: 'ID', type: QueryEditorPropertyType.Boolean },
      operator: { name: '==', value: false },
    };
    expect(sanitizeOperator(op)).toEqual({ type: QueryEditorExpressionType.Operator, ...op });
  });
});

describe('sanitizeAggregate', () => {
  it('ignores an expression with a missing reduce name', () => {
    expect(
      sanitizeAggregate({
        property: { name: '', type: QueryEditorPropertyType.String },
        reduce: { name: '', type: QueryEditorPropertyType.Function },
        type: QueryEditorExpressionType.Reduce,
      })
    ).toBeUndefined();
  });

  it('ignores an expression with a missing column name', () => {
    expect(
      sanitizeAggregate({
        property: { name: '', type: QueryEditorPropertyType.String },
        reduce: { name: AggregateFunctions.Avg, type: QueryEditorPropertyType.Function },
        type: QueryEditorExpressionType.Reduce,
      })
    ).toBeUndefined();
  });

  it('returns a valid aggregation', () => {
    const op = {
      property: { name: 'col', type: QueryEditorPropertyType.String },
      reduce: { name: AggregateFunctions.Avg, type: QueryEditorPropertyType.Function },
      type: QueryEditorExpressionType.Reduce,
    };
    expect(sanitizeAggregate(op)).toEqual(op);
  });

  it('returns a valid aggregation (count)', () => {
    const op = {
      property: { name: '', type: QueryEditorPropertyType.String },
      reduce: { name: AggregateFunctions.Count, type: QueryEditorPropertyType.Function },
      type: QueryEditorExpressionType.Reduce,
    };
    expect(sanitizeAggregate(op)).toEqual(op);
  });

  it('ignores an invalid percentile aggregation', () => {
    const op = {
      property: { name: 'col', type: QueryEditorPropertyType.String },
      reduce: { name: AggregateFunctions.Percentile, type: QueryEditorPropertyType.Function },
      type: QueryEditorExpressionType.Reduce,
    };
    expect(sanitizeAggregate(op)).toBeUndefined();
  });

  it('returns a valid percentile aggregation', () => {
    const op = {
      property: { name: 'col', type: QueryEditorPropertyType.String },
      reduce: { name: AggregateFunctions.Percentile, type: QueryEditorPropertyType.Function },
      parameters: [
        {
          type: QueryEditorExpressionType.FunctionParameter,
          fieldType: QueryEditorPropertyType.Number,
          value: '1',
          name: 'percentileParam',
        },
      ],
      type: QueryEditorExpressionType.Reduce,
    };
    expect(sanitizeAggregate(op)).toEqual(op);
  });
});

describe('sanitizeGroupBy', () => {
  it('ignores an expression with a missing column', () => {
    expect(
      sanitizeGroupBy({
        property: { name: '', type: QueryEditorPropertyType.String },
        type: QueryEditorExpressionType.GroupBy,
      })
    ).toBeUndefined();
  });

  it('ignores an expression with a missing interval for a DateTime', () => {
    expect(
      sanitizeGroupBy({
        property: { name: 'Time', type: QueryEditorPropertyType.DateTime },
        interval: { name: '', type: QueryEditorPropertyType.Interval },
        type: QueryEditorExpressionType.GroupBy,
      })
    ).toBeUndefined();
  });

  it('returns a valid group', () => {
    const op = {
      property: { name: 'col', type: QueryEditorPropertyType.String },
      type: QueryEditorExpressionType.GroupBy,
    };
    expect(sanitizeGroupBy(op)).toEqual(op);
  });
});

describe('defaultTimeSeriesColumns', () => {
  it('should return a time and numeric value', () => {
    expect(
      defaultTimeSeriesColumns(defaultQuery.expression, [
        { Name: 'time', CslType: 'datetime' },
        { Name: 'measure', CslType: 'long' },
      ])
    ).toEqual(['time', 'measure']);
  });

  it('should include a column used in a filter', () => {
    expect(
      defaultTimeSeriesColumns(
        {
          ...defaultQuery.expression,
          where: {
            type: QueryEditorExpressionType.And,
            expressions: [
              {
                type: QueryEditorExpressionType.Operator,
                expressions: [
                  {
                    type: QueryEditorExpressionType.Property,
                    property: { name: 'foo', type: QueryEditorPropertyType.DateTime },
                    operator: { name: '==', value: 'bar' },
                  },
                ],
              },
            ],
          },
        },
        [
          { Name: 'time', CslType: 'datetime' },
          { Name: 'measure', CslType: 'long' },
          { Name: 'foo', CslType: 'datetime' },
        ]
      )
    ).toEqual(['foo', 'measure']);
  });

  it('should include a column used in an aggregation', () => {
    expect(
      defaultTimeSeriesColumns(
        {
          ...defaultQuery.expression,
          reduce: {
            type: QueryEditorExpressionType.And,
            expressions: [
              {
                type: QueryEditorExpressionType.Operator,
                property: { name: 'foo', type: QueryEditorPropertyType.TimeSpan },
                reduce: { name: AggregateFunctions.Avg, type: QueryEditorPropertyType.Function },
              },
            ],
          },
        },
        [
          { Name: 'time', CslType: 'datetime' },
          { Name: 'measure', CslType: 'long' },
          { Name: 'foo', CslType: 'timespan' },
        ]
      )
    ).toEqual(['foo', 'time', 'measure']);
  });

  it('should include a column used in a group by', () => {
    expect(
      defaultTimeSeriesColumns(
        {
          ...defaultQuery.expression,
          groupBy: {
            type: QueryEditorExpressionType.And,
            expressions: [
              {
                type: QueryEditorExpressionType.Operator,
                property: { name: 'foo', type: QueryEditorPropertyType.TimeSpan },
              },
            ],
          },
        },
        [
          { Name: 'time', CslType: 'datetime' },
          { Name: 'measure', CslType: 'long' },
          { Name: 'foo', CslType: 'timespan' },
        ]
      )
    ).toEqual(['foo', 'time', 'measure']);
  });
});
