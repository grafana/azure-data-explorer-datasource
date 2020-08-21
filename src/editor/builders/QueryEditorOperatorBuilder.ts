import { QueryEditorOperatorDefinition, QueryEditorPropertyType } from '../types';

export class QueyEditorOperatorBuilder {
  private label: string;
  private description: string;
  private types: QueryEditorPropertyType[];
  private multiple: boolean;
  private bool: boolean;

  constructor(private value: string, private operators: QueryEditorOperatorDefinition[]) {
    this.label = value;
    this.types = [];
    this.description = '';
    this.multiple = false;
    this.bool = false;
  }

  withLabel(label: string) {
    this.label = label;
    return this;
  }

  withDescription(description: string) {
    this.description = description;
    return this;
  }

  supportTypes(types: QueryEditorPropertyType[]) {
    this.types = types;
    return this;
  }

  multipleValues(multiple: boolean) {
    this.multiple = multiple;
    return this;
  }

  booleanValues(bool: boolean) {
    this.bool = bool;
    return this;
  }

  add(): void {
    this.operators.push({
      value: this.value,
      supportTypes: this.types,
      label: this.label,
      description: this.description,
      multipleValues: this.multiple,
      booleanValues: this.bool,
    });
  }
}
