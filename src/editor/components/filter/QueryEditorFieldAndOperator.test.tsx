import { render, screen } from '@testing-library/react';
import { QueryEditorExpressionType, QueryEditorOperatorExpression } from 'editor/expressions';
import { QueryEditorPropertyType } from 'editor/types';
import React from 'react';
import { QueryEditorFieldAndOperator } from './QueryEditorFieldAndOperator';
import { openMenu } from 'react-select-event';

const defaultProps = {
  fields: [
    {
      value: 'bar',
      type: QueryEditorPropertyType.String,
    },
  ],
  templateVariableOptions: {
    label: 'Template Variables',
    options: [{ label: '$foo', value: '$foo' }],
  },
  operators: [
    {
      value: '==',
      supportTypes: [QueryEditorPropertyType.String],
      label: '==',
      description: 'equal to',
      multipleValues: false,
      booleanValues: false,
    },
  ],
  onChange: jest.fn(),
  getSuggestions: jest.fn().mockResolvedValue([]),
};

describe('QueryEditorFieldAndOperator', () => {
  it('should render without errors', () => {
    render(<QueryEditorFieldAndOperator {...defaultProps} />);
    expect(screen.getByText('Choose column...')).toBeInTheDocument();
  });

  it('should quote variables if it targets a string', async () => {
    const value: QueryEditorOperatorExpression = {
      property: {
        type: QueryEditorPropertyType.String,
        name: 'myvar',
      },
      operator: {
        name: '==',
        value: '==',
      },
      type: QueryEditorExpressionType.Or,
    };
    const onChange = jest.fn();
    render(<QueryEditorFieldAndOperator {...defaultProps} value={value} onChange={onChange} />);

    const sel = screen.getByLabelText('choose column for where filter');
    openMenu(sel);
    // select a column
    screen.getByText(defaultProps.fields[0].value).click();

    const valueSel = screen.getByLabelText('select value');
    openMenu(valueSel);
    const valueTemplateVariableGroup = screen.getByText('Template Variables');
    valueTemplateVariableGroup.click();
    expect(screen.getByText('$foo')).toBeInTheDocument();
    screen.getByText('$foo').click();

    expect(onChange).toBeCalledWith({
      operator: { name: '==', value: `'$foo'`, labelValue: '$foo' },
      property: { name: 'myvar', type: 'string' },
      type: 'or',
    });
  });
});
