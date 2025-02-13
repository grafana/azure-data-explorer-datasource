import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryEditorExpressionType } from 'types/expressions';
import { mockDatasource, mockQuery } from 'components/__fixtures__/Datasource';
import React from 'react';
import { openMenu } from 'react-select-event';
import { QueryEditorPropertyType } from 'schema/types';
import Timeshift from './Timeshift';

const defaultProps = {
  datasource: mockDatasource(),
  query: mockQuery,
  templateVariableOptions: {},
  tableSchema: {
    loading: false,
    value: [
      {
        Name: 'foo',
        CslType: 'string',
      },
    ],
  },
  database: 'db',
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
};

describe('TimeshiftItem', () => {
  it('should select a time shift', async () => {
    const onChange = jest.fn();
    render(<Timeshift {...defaultProps} onChange={onChange} />);
    await waitFor(async () => {
      (await screen.getByLabelText('Add')).click();
      const sel = await screen.getByLabelText('timeshift');
      act(() => openMenu(sel));
      (await screen.getByText('Hour before')).click();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({
          timeshift: {
            property: { name: '1h', type: QueryEditorPropertyType.TimeSpan },
            type: QueryEditorExpressionType.Property,
          },
        }),
      })
    );
  });
});
