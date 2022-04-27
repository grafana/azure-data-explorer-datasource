import { DataFrame, FieldType } from '@grafana/data';
import { firstStringFieldToMetricFindValue } from './responseHelpers';

describe('firstStringFieldToMetricFindValue', () => {
  it('should find a string field value', () => {
    const frame: DataFrame = {
      fields: [
        {
          type: FieldType.string,
          name: '',
          config: {},
          values: {
            length: 1,
            get: () => 'foo',
            toArray: () => [],
          },
        },
      ],
      length: 1,
    };
    expect(firstStringFieldToMetricFindValue(frame)).toEqual([{ text: 'foo' }]);
  });
});
