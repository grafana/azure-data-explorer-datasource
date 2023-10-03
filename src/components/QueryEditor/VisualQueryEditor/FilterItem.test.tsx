import { render, screen } from '@testing-library/react';
import { mockDatasource, mockQuery } from 'components/__fixtures__/Datasource';
import { AdxColumnSchema } from 'types';
import FilterItem from './FilterItem';
import React from 'react';
import { openMenu } from 'react-select-event';
import { QueryEditorPropertyType } from 'schema/types';
import userEvent from '@testing-library/user-event';

const defaultProps = {
  datasource: mockDatasource(),
  query: mockQuery,
  filter: {},
  columns: [],
  templateVariableOptions: {},
  onChange: jest.fn(),
  onDelete: jest.fn(),
  filtersLength: 0,
};

describe('FilterItem', () => {
  it('should select a column', () => {
    const onChange = jest.fn();
    const columns: AdxColumnSchema[] = [
      {
        Name: 'foo',
        CslType: 'string',
      },
    ];
    render(<FilterItem {...defaultProps} columns={columns} onChange={onChange} />);
    const sel = screen.getByLabelText('column');
    openMenu(sel);
    screen.getByText('foo').click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ property: { name: 'foo', type: QueryEditorPropertyType.String } })
    );
  });

  it('should select an operator', () => {
    const onChange = jest.fn();
    render(<FilterItem {...defaultProps} onChange={onChange} />);
    const sel = screen.getByLabelText('operator');
    openMenu(sel);
    screen.getByText('!=').click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: { name: '!=', value: '' } }));
  });

  it('should select a value', async () => {
    const datasource = mockDatasource();
    datasource.autoCompleteQuery = jest.fn().mockResolvedValue(['foo', 'bar']);
    const onChange = jest.fn();
    const filter = { property: { name: 'col', type: QueryEditorPropertyType.String } };
    render(<FilterItem {...defaultProps} datasource={datasource} onChange={onChange} filter={filter} />);
    const sel = screen.getByLabelText('column value');
    openMenu(sel);
    (await screen.findByText('foo')).click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: { name: '==', value: 'foo' } }));
  });

  it('should select a template variable', async () => {
    const datasource = mockDatasource();
    datasource.autoCompleteQuery = jest.fn().mockResolvedValue([]);
    const onChange = jest.fn();
    const filter = { property: { name: 'col', type: QueryEditorPropertyType.String } };
    const templateVariableOptions = {
      label: 'Template Variables',
      options: [{ label: '$foo', value: '$foo' }],
    };
    render(
      <FilterItem
        {...defaultProps}
        datasource={datasource}
        onChange={onChange}
        filter={filter}
        templateVariableOptions={templateVariableOptions}
      />
    );
    const sel = screen.getByLabelText('column value');
    openMenu(sel);
    (await screen.findByText('Template Variables')).click();
    (await screen.findByText('$foo')).click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: { name: '==', value: "'$foo'" } }));
  });

  it('type a numeric value', async () => {
    const datasource = mockDatasource();
    datasource.autoCompleteQuery = jest.fn().mockResolvedValue([]);
    const onChange = jest.fn();
    const filter = { property: { name: 'col', type: QueryEditorPropertyType.Number } };
    render(<FilterItem {...defaultProps} datasource={datasource} onChange={onChange} filter={filter} />);
    const input = screen.getByLabelText('column number value');
    await userEvent.type(input, '1');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: { name: '==', value: 1 } }));
  });

  it('type a datetime value', async () => {
    const datasource = mockDatasource();
    datasource.autoCompleteQuery = jest.fn().mockResolvedValue([]);
    const onChange = jest.fn();
    const filter = { property: { name: 'col', type: QueryEditorPropertyType.DateTime } };
    render(<FilterItem {...defaultProps} datasource={datasource} onChange={onChange} filter={filter} />);
    const input = screen.getByLabelText('column datetime value');
    await userEvent.type(input, '1');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: { name: '==', value: '1' } }));
  });
});
