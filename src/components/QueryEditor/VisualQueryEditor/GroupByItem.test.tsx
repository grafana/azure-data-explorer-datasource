import { act, render, screen, waitFor } from '@testing-library/react';
import { mockQuery } from 'components/__fixtures__/Datasource';
import { AdxColumnSchema } from 'types';
import React from 'react';
import { openMenu } from 'react-select-event';
import { QueryEditorPropertyType } from 'schema/types';
import GroupByItem from './GroupByItem';

const defaultProps = {
  query: mockQuery,
  groupBy: {},
  columns: [],
  templateVariableOptions: {},
  onChange: jest.fn(),
  onDelete: jest.fn(),
};

describe('GroupByItem', () => {
  it('should select a column', async () => {
    const onChange = jest.fn();
    const columns: AdxColumnSchema[] = [
      {
        Name: 'foo',
        CslType: 'string',
      },
    ];
    render(<GroupByItem {...defaultProps} columns={columns} onChange={onChange} />);
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
    const onChange = jest.fn();
    const templateVariableOptions = {
      label: 'Template Variables',
      options: [{ label: '$foo', value: '$foo' }],
    };
    render(<GroupByItem {...defaultProps} onChange={onChange} templateVariableOptions={templateVariableOptions} />);
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

  it('should add an interval when using a DateTime', async () => {
    const onChange = jest.fn();
    const groupBy = {
      property: { name: 'Time', type: QueryEditorPropertyType.DateTime },
    };
    render(<GroupByItem {...defaultProps} onChange={onChange} groupBy={groupBy} />);
    await waitFor(async () => {
      const sel = await screen.getByLabelText('interval');
      act(() => openMenu(sel));
      (await screen.getByText('1 minute')).click();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ interval: { name: '1m', type: QueryEditorPropertyType.Interval } })
    );
  });
});
