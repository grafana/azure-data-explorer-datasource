import { act, render, screen, waitFor } from '@testing-library/react';
import { mockDatasource, mockQuery } from 'components/__fixtures__/Datasource';
import { AdxColumnSchema } from 'types';
import React from 'react';
import { openMenu } from 'react-select-event';
import { QueryEditorPropertyType } from 'schema/types';
import AggregateItem, { AggregateFunctions } from './AggregateItem';

const defaultProps = {
  datasource: mockDatasource(),
  query: mockQuery,
  aggregate: {},
  columns: [],
  templateVariableOptions: {},
  onChange: jest.fn(),
  onDelete: jest.fn(),
};

describe('AggregateItem', () => {
  it('should select an function', async () => {
    const onChange = jest.fn();
    render(<AggregateItem {...defaultProps} onChange={onChange} />);
    await waitFor(async () => {
      const sel = await screen.getByLabelText('function');
      act(() => openMenu(sel));
      (await screen.getByText(AggregateFunctions.Avg)).click();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ reduce: { name: AggregateFunctions.Avg, type: QueryEditorPropertyType.Function } })
    );
  });

  it('should select a column', async () => {
    const onChange = jest.fn();
    const columns: AdxColumnSchema[] = [
      {
        Name: 'foo',
        CslType: 'string',
      },
    ];
    render(<AggregateItem {...defaultProps} columns={columns} onChange={onChange} />);
    await waitFor(async () => {
      const sel = await screen.getByLabelText('column');
      act(() => openMenu(sel));
      (await screen.getByText('foo')).click();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ property: { name: 'foo', type: QueryEditorPropertyType.String } })
    );
  });

  it('should select a template variable', async () => {
    const datasource = mockDatasource();
    datasource.autoCompleteQuery = jest.fn().mockResolvedValue([]);
    const onChange = jest.fn();
    const templateVariableOptions = {
      label: 'Template Variables',
      options: [{ label: '$foo', value: '$foo' }],
    };
    render(
      <AggregateItem
        {...defaultProps}
        datasource={datasource}
        onChange={onChange}
        templateVariableOptions={templateVariableOptions}
      />
    );
    await waitFor(async () => {
      const sel = await screen.getByLabelText('column');
      act(() => openMenu(sel));
      (await screen.getByText('Template Variables')).click();
      (await screen.findByText('$foo')).click();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ property: { name: '$foo', type: QueryEditorPropertyType.String } })
    );
  });

  it('should skip the column for the count function', () => {
    const onChange = jest.fn();
    const aggregate = {
      property: { name: '', type: QueryEditorPropertyType.String },
      reduce: { name: AggregateFunctions.Count, type: QueryEditorPropertyType.Function },
    };
    render(<AggregateItem {...defaultProps} onChange={onChange} aggregate={aggregate} />);
    expect(screen.queryByLabelText('column')).not.toBeInTheDocument();
  });

  it('should add a parameter when using a percentile', async () => {
    const onChange = jest.fn();
    const aggregate = {
      property: { name: '', type: QueryEditorPropertyType.String },
      reduce: { name: AggregateFunctions.Percentile, type: QueryEditorPropertyType.Function },
    };
    render(<AggregateItem {...defaultProps} onChange={onChange} aggregate={aggregate} />);
    await waitFor(async () => {
      const sel = await screen.getByLabelText('percentile');
      act(() => openMenu(sel));
      (await screen.getByText('95')).click();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: [{ fieldType: 'number', name: 'percentileParam', type: 'functionParameter', value: '95' }],
      })
    );
  });
});
