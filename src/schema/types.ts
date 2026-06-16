import { SelectableValue } from '@grafana/data';

export enum QueryEditorPropertyType {
  Number = 'number',
  String = 'string',
  Boolean = 'boolean',
  DateTime = 'dateTime',
  TimeSpan = 'timeSpan',
  Function = 'function',
  Interval = 'interval',
}

export interface QueryEditorProperty {
  type: QueryEditorPropertyType;
  name: string;
}

export type QueryEditorOperatorType = string | boolean | number | SelectableValue<string>;
export type QueryEditorOperatorValueType = QueryEditorOperatorType | QueryEditorOperatorType[];

export interface QueryEditorOperator<T = QueryEditorOperatorValueType> {
  name: string;
  value: T;
  labelValue?: string;
}

export interface QueryEditorOperatorDefinition {
  value: string;
  supportTypes: QueryEditorPropertyType[];
  multipleValues: boolean;
  booleanValues: boolean;
  label?: string;
  description?: string;
}

export interface QueryEditorPropertyDefinition {
  value: string;
  type: QueryEditorPropertyType;
  label?: string;
  dynamic?: boolean;
}

export interface QueryEditorFunctionDefinition extends QueryEditorPropertyDefinition {
  parameters?: QueryEditorFunctionParameter[];
  applyOnField: boolean;
}

export interface QueryEditorFunctionParameter {
  name: string;
  type: QueryEditorPropertyType;
  description: string;
  value?: string;
}
