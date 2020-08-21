import React, { PureComponent } from 'react';
import { AsyncMultiSelect } from '@grafana/ui';
import { ExpressionSuggestor } from '../types';
import { QueryEditorOperatorDefinition, QueryEditorOperator } from '../../types';
import { SelectableValue } from '@grafana/data';

interface Props {
  values: string[] | undefined;
  onChange: (expression: QueryEditorOperator<string[]>) => void;
  operator: QueryEditorOperatorDefinition;
  getSuggestions: ExpressionSuggestor;
  templateVariableOptions: SelectableValue<string>;
}

export class QueryEditorMultiOperator extends PureComponent<Props> {
  onCreate = (value: string) => {
    if (!value) {
      return;
    }
    // Append the new value
    const values = [...this.props.values, value];
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
      value: selectable.map(s => s.value),
      name: this.props.operator.value,
    });
  };

  getSuggestions = (txt: string) => {
    return this.props.getSuggestions(txt);
  };

  render() {
    const values = this.props.values || [];
    const current = values.map(v => {
      return { label: v, value: v };
    });

    return (
      <AsyncMultiSelect
        width={30}
        defaultOptions={[this.props.templateVariableOptions]}
        placeholder="Start typing to add filters..."
        loadOptions={this.getSuggestions}
        value={current}
        onChange={this.onChange}
        onCreateOption={this.onCreate}
        noOptionsMessage="No options found"
        isClearable
      />
    );
  }
}
