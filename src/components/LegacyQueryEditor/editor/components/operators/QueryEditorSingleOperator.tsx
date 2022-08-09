import React, { PureComponent } from 'react';
import { AsyncSelect } from '@grafana/ui';
import { ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition, QueryEditorOperator } from '../../../../../schema/types';
import { SelectableValue } from '@grafana/data';

interface Props {
  value: string | undefined;
  onChange: (operator: QueryEditorOperator) => void;
  operator: QueryEditorOperatorDefinition;
  getSuggestions: ExpressionSuggestor;
  templateVariableOptions: SelectableValue<string>;
  labelValue?: string;
}

interface State {
  defaultOptions: Array<SelectableValue<string>>;
  isLoading: boolean;
}

export class QueryEditorSingleOperator extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      defaultOptions: [props.templateVariableOptions],
      isLoading: false,
    };
  }

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
      value: evt.value,
      name: this.props.operator.value,
      labelValue: evt.label,
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
    this.setState({ isLoading: true });

    const options = await this.props.getSuggestions(txt);

    this.setState({
      defaultOptions: [this.props.templateVariableOptions, ...options],
      isLoading: false,
    });

    return options;
  };

  render() {
    const { value, labelValue } = this.props;
    const label = labelValue || value;
    const current = value ? { label, value } : undefined;

    return (
      <AsyncSelect
        width={30}
        placeholder="Start typing to add filters..."
        loadOptions={this.getSuggestions}
        onOpenMenu={() => this.getSuggestions(label ?? '')}
        defaultOptions={this.state.defaultOptions}
        isLoading={this.state.isLoading}
        value={current}
        onChange={this.onChange}
        onCreateOption={this.onCreate}
        allowCustomValue={true}
        backspaceRemovesValue
        isClearable
        noOptionsMessage="No options found"
        aria-label="select value for where filter"
      />
    );
  }
}
