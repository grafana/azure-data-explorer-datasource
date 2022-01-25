import { DataFrame, MetricFindValue, FieldType } from '@grafana/data';

export function firstStringFieldToMetricFindValue(frame: DataFrame): MetricFindValue[] {
  const values: MetricFindValue[] = [];
  const field = frame.fields.find((f) => f.type === FieldType.string);
  if (field) {
    for (let i = 0; i < field.values.length; i++) {
      values.push({ text: field.values.get(i) });
    }
  }
  return values;
}
