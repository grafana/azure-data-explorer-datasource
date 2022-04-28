import { FieldType, toDataFrame } from '@grafana/data';
import { firstStringFieldToMetricFindValue } from './responseHelpers';

describe('firstStringFieldToMetricFindValue', () => {
  it('should find a string field value', () => {
    const frame = toDataFrame({
      fields: [
        {
          type: FieldType.string,
          values: ['foo'],
        },
      ],
    });
    expect(firstStringFieldToMetricFindValue(frame)).toEqual([{ text: 'foo' }]);
  });
});
