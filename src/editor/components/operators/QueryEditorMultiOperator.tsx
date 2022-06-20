import React, { PureComponent } from 'react';
import { AsyncMultiSelect } from '@grafana/ui';
import { ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition, QueryEditorOperator } from '../../types';
import { SelectableValue } from '@grafana/data';
import { isStringArray } from 'editor/guards';

interface Props {
  values: string[] | Array<SelectableValue<string>> | undefined;
  onChange: (expression: QueryEditorOperator<string[] | Array<SelectableValue<string>>>) => void;
  operator: QueryEditorOperatorDefinition;
  getSuggestions: ExpressionSuggestor;
  templateVariableOptions: SelectableValue<string>;
}

interface State {
  defaultOptions: Array<SelectableValue<string>>;
  isLoading: boolean;
}

export class QueryEditorMultiOperator extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      defaultOptions: [props.templateVariableOptions],
      isLoading: false,
    };
  }

  onCreate = (value: string) => {
    if (!value) {
      return;
    }
    // Append the new value
    const values = this.props.values || [];
    if (isStringArray(values)) {
      values.push(value);
    } else {
      values.push({ label: value, value: value });
    }
    this.props.onChange({
      value: values,
      name: this.props.operator.value,
    });
  };

  onChange = (selectable: any) => {
    if (!Array.isArray(selectable)) {
      return;
    }

    this.props.onChange({
      value: selectable.map((s) => {
        return { value: s.value, label: s.label };
      }),
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
    const values = this.props.values || [];
    let current: Array<SelectableValue<string>>;
    if (isStringArray(values)) {
      current = values.map((v) => {
        return { label: v, value: v };
      });
    } else {
      current = values;
    }
    return (
      <AsyncMultiSelect
        width={30}
        placeholder="Start typing to add filters..."
        loadOptions={this.getSuggestions}
        onOpenMenu={() => this.getSuggestions('')}
        defaultOptions={this.state.defaultOptions}
        isLoading={this.state.isLoading}
        value={current}
        onChange={this.onChange}
        onCreateOption={this.onCreate}
        noOptionsMessage="No options found"
        isClearable
        allowCustomValue
      />
    );
  }
}
