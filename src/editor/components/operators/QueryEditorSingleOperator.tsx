import React, { PureComponent } from 'react';
import { AsyncSelect } from '@grafana/ui';
import { ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition, QueryEditorOperator } from '../../types';
import { SelectableValue } from '@grafana/data';

interface Props {
  value: string | undefined;
  onChange: (operator: QueryEditorOperator) => void;
  operator: QueryEditorOperatorDefinition;
  getSuggestions: ExpressionSuggestor;
  templateVariableOptions: SelectableValue<string>;
}
export class QueryEditorSingleOperator extends PureComponent<Props> {
  onChange = (evt: SelectableValue<any>) => {
    // Handle clearing the value
    if (evt === null) {
      this.props.onChange({
        value: '',
        name: this.props.operator.value,
      });
      return;
    }
    this.props.onChange({
      value: `${evt.value}`, // Currently strings only
      name: this.props.operator.value,
    });
  };

  onCreate = (value: string) => {
    if (!value) {
      return;
    }
    this.props.onChange({
      value,
      name: this.props.operator.value,
    });
  };

  getSuggestions = async (txt: string) => {
    return this.props.getSuggestions(txt);
  };

  render() {
    const { value, templateVariableOptions } = this.props;
    const current = value
      ? {
          label: value,
          value,
        }
      : undefined;

    return (
      <AsyncSelect
        width={30}
        placeholder="Start typing to add filters..."
        loadOptions={this.getSuggestions}
        defaultOptions={[templateVariableOptions]}
        value={current}
        onChange={this.onChange}
        onCreateOption={this.onCreate}
        allowCustomValue={true}
        backspaceRemovesValue
        isClearable
        noOptionsMessage="No options found"
      />
    );
  }
}
