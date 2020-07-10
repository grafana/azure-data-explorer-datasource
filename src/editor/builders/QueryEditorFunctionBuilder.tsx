import { QueryEditorFieldType, QueryEditorFieldDefinition } from '../types';

export class QueryEditorFunctionBuilder {
  private label: string;

  constructor(private value: string, private functions: QueryEditorFieldDefinition[]) {
    this.label = value;
  }

  withLabel(label: string) {
    this.label = label;
    return this;
  }

  add(): void {
    this.functions.push({
      value: this.value,
      label: this.label,
      type: QueryEditorFieldType.Function,
    });
  }
}
