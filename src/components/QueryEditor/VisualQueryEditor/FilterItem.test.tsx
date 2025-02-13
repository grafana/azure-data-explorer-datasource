import { act, render, screen, waitFor } from '@testing-library/react';
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
  it('should select a column', async () => {
    const onChange = jest.fn();
    const columns: AdxColumnSchema[] = [
      {
        Name: 'foo',
        CslType: 'string',
      },
    ];
    render(<FilterItem {...defaultProps} columns={columns} onChange={onChange} />);
    await waitFor(async () => {
      const sel = await screen.getByLabelText('column');
      act(() => openMenu(sel));
      (await screen.getByText('foo')).click();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ property: { name: 'foo', type: QueryEditorPropertyType.String } })
    );
  });

  it('should select an operator', async () => {
    const onChange = jest.fn();
    render(<FilterItem {...defaultProps} onChange={onChange} />);
    await waitFor(async () => {
      const sel = await screen.getByLabelText('operator');
      act(() => openMenu(sel));
      (await screen.getByText('!=')).click();
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: { name: '!=', value: '' } }));
  });

  it('should select a value', async () => {
    const datasource = mockDatasource();
    datasource.autoCompleteQuery = jest.fn().mockResolvedValue(['foo', 'bar']);
    const onChange = jest.fn();
    const filter = { property: { name: 'col', type: QueryEditorPropertyType.String } };
    render(<FilterItem {...defaultProps} datasource={datasource} onChange={onChange} filter={filter} />);
    await waitFor(async () => {
      const sel = await screen.getByLabelText('column value');
      act(() => openMenu(sel));
      const value = await screen.getByText('foo');
      value.click();
    });
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
    await waitFor(async () => {
      const sel = await screen.getByLabelText('column value');
      act(() => openMenu(sel));
      (await screen.getByText('Template Variables')).click();
      (await screen.findByText('$foo')).click();
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: { name: '==', value: '$foo' } }));
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
