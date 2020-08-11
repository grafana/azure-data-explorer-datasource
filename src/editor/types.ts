export enum QueryEditorPropertyType {
  Number = 'number',
  String = 'string',
  Boolean = 'boolean',
  DateTime = 'dateTime',
  Function = 'function',
  Interval = 'interval',
}

export interface QueryEditorProperty {
  type: QueryEditorPropertyType;
  name: string;
}

export interface QueryEditorOperator<T> {
  value: T;
}

export interface QueryEditorArrayOperator<T> {
  values: T[];
}
export interface QueryEditorOperatorDefinition {
  value: string;
  supportTypes: QueryEditorPropertyType[];
  multipleValues: boolean;
  booleanValues: boolean;
  label?: string;
  description?: string;
}

export interface QueryEditorFieldDefinition {
  value: string;
  type: QueryEditorPropertyType;
  label?: string;
}

export interface QueryEditorFunctionDefinition extends QueryEditorFieldDefinition {
  parameters?: QueryEditorFunctionParameter[];
}

export interface QueryEditorFunctionParameter {
  name: string;
  type: QueryEditorPropertyType;
  description: string;
  value?: string;
}
