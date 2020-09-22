import { QueryEditorPropertyType, QueryEditorPropertyDefinition } from '../types';

export class QueryEditorIntervalBuilder {
  private label: string;

  constructor(private value: string, private intervals: QueryEditorPropertyDefinition[]) {
    this.label = value;
  }

  withLabel(label: string) {
    this.label = label;
    return this;
  }

  add(): void {
    this.intervals.push({
      value: this.value,
      label: this.label,
      type: QueryEditorPropertyType.Interval,
    });
  }
}
