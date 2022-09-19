import { render, screen } from '@testing-library/react';
import { QueryEditorExpressionType } from 'components/LegacyQueryEditor/editor/expressions';
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
  it('should select a table', () => {
    const onChange = jest.fn();
    render(<TableSection {...defaultProps} onChange={onChange} />);
    // Select a table
    const sel = screen.getByLabelText('Table');
    openMenu(sel);
    screen.getByText('mytable').click();
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

  it('should select a column', () => {
    const onChange = jest.fn();
    render(<TableSection {...defaultProps} onChange={onChange} />);
    // Select a table
    const sel = screen.getByLabelText('Columns');
    openMenu(sel);
    screen.getByText('foo').click();
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
});
