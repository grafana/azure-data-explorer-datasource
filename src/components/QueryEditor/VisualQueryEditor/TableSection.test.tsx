import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryEditorExpressionType } from 'types/expressions';
import { mockDatasource, mockQuery } from 'components/__fixtures__/Datasource';
import React from 'react';
import { openMenu } from 'react-select-event';
import { QueryEditorPropertyType } from 'schema/types';
import TableSection from './TableSection';

const defaultProps = {
  datasource: mockDatasource(),
  query: mockQuery,
  templateVariableOptions: {},
  tables: [{ label: 'mytable', value: 'mytable', type: QueryEditorPropertyType.String }],
  tableSchema: {
    loading: false,
    value: [
      {
        Name: 'foo',
        CslType: 'string',
      },
    ],
  },
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
};

describe('TableSection', () => {
  it('should select a table', async () => {
    const onChange = jest.fn();
    render(<TableSection {...defaultProps} onChange={onChange} />);
    await waitFor(async () => {
      // Select a table
      const sel = await screen.getByLabelText('Table');
      act(() => openMenu(sel));
      (await screen.getByText('mytable')).click();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({
          from: {
            type: QueryEditorExpressionType.Property,
            property: { type: QueryEditorPropertyType.String, name: 'mytable' },
          },
        }),
      })
    );
  });

  it('should select a column', async () => {
    const onChange = jest.fn();
    render(<TableSection {...defaultProps} onChange={onChange} />);
    await waitFor(async () => {
      // Select a table
      const sel = await screen.getByLabelText('Columns');
      act(() => openMenu(sel));
      (await screen.getByText('foo')).click();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({
          columns: {
            type: QueryEditorExpressionType.Property,
            columns: ['foo'],
          },
        }),
      })
    );
  });

  it('should pre-select some columns for the time series format', () => {
    const onChange = jest.fn();
    const tableSchema = {
      loading: false,
      value: [
        {
          Name: 'time',
          CslType: 'datetime',
        },
        {
          Name: 'measure',
          CslType: 'long',
        },
      ],
    };
    const query = {
      ...mockQuery,
      resultFormat: 'time_series',
    };
    render(<TableSection {...defaultProps} onChange={onChange} tableSchema={tableSchema} query={query} />);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({
          columns: {
            type: QueryEditorExpressionType.Property,
            columns: ['time', 'measure'],
          },
        }),
      })
    );
  });
});
