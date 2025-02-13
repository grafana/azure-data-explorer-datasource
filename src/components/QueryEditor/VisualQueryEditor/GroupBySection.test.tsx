import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryEditorExpressionType } from 'types/expressions';
import { mockDatasource, mockQuery } from 'components/__fixtures__/Datasource';
import React from 'react';
import { openMenu } from 'react-select-event';
import { QueryEditorPropertyType } from 'schema/types';
import GroupBySection from './GroupBySection';

const defaultProps = {
  datasource: mockDatasource(),
  query: mockQuery,
  templateVariableOptions: {},
  columns: [{ Name: 'foo', CslType: 'string' }],
  database: 'db',
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
};

describe('GroupBySection', () => {
  it('add a grouping', async () => {
    const onChange = jest.fn();
    render(<GroupBySection {...defaultProps} onChange={onChange} />);
    await waitFor(async () => {
      screen.getByLabelText('Add').click();
      // Select a function
      const sel = await screen.getByLabelText('column');
      act(() => openMenu(sel));
      (await screen.getByText('foo')).click();
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({
          groupBy: {
            expressions: [
              {
                property: { name: 'foo', type: QueryEditorPropertyType.String },
                type: QueryEditorExpressionType.GroupBy,
                focus: false,
              },
            ],
            type: QueryEditorExpressionType.And,
          },
        }),
      })
    );
  });

  it('cleans up the when the table changes', () => {
    const query = {
      ...defaultProps.query,
      expression: {
        ...defaultProps.query.expression,
        from: {
          type: QueryEditorExpressionType.Property,
          property: { type: QueryEditorPropertyType.String, name: 'mytable' },
        },
        groupBy: {
          expressions: [
            {
              property: { name: 'foo', type: QueryEditorPropertyType.String },
              type: QueryEditorExpressionType.GroupBy,
            },
          ],
          type: QueryEditorExpressionType.And,
        },
      },
    };
    const { rerender } = render(<GroupBySection {...defaultProps} query={query} />);
    expect(screen.getByText('foo')).toBeInTheDocument();
    query.expression.from!.property.name = 'other';
    query.expression.groupBy.expressions = [];
    rerender(<GroupBySection {...defaultProps} query={query} />);
    expect(screen.queryByText('foo')).not.toBeInTheDocument();
  });
});
