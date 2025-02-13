import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryEditorExpressionType } from 'types/expressions';
import { mockDatasource, mockQuery } from 'components/__fixtures__/Datasource';
import React from 'react';
import { openMenu } from 'react-select-event';
import { QueryEditorPropertyType } from 'schema/types';
import { AggregateFunctions } from './AggregateItem';
import AggregateSection from './AggregateSection';

const defaultProps = {
  datasource: mockDatasource(),
  query: mockQuery,
  templateVariableOptions: {},
  columns: [{ Name: 'foo', CslType: 'string' }],
  database: 'db',
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
};

describe('AggregateSection', () => {
  it('add an aggregation function', async () => {
    const onChange = jest.fn();
    render(<AggregateSection {...defaultProps} onChange={onChange} />);
    await waitFor(async () => {
      (await screen.findByLabelText('Add')).click();
      // Select a function
      const sel = await screen.findByLabelText('function');
      act(() => openMenu(sel));
      (await screen.getByText(AggregateFunctions.Avg)).click();
    });
    // The info is not complete so onChange is called with an empty aggregation
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({ reduce: { expressions: [], type: QueryEditorExpressionType.And } }),
      })
    );

    await waitFor(async () => {
      // Select a column
      const selCol = await screen.findByLabelText('column');
      act(() => openMenu(selCol));
      (await screen.findByText('foo')).click();
    });
    // Now it's a complete aggregation function so it should change the expression
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({
          reduce: {
            expressions: [
              {
                parameters: undefined,
                property: { name: 'foo', type: QueryEditorPropertyType.String },
                reduce: { name: AggregateFunctions.Avg, type: QueryEditorPropertyType.String },
                type: QueryEditorExpressionType.Reduce,
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
        reduce: {
          expressions: [
            {
              parameters: undefined,
              property: { name: 'foo', type: QueryEditorPropertyType.String },
              reduce: { name: AggregateFunctions.Avg, type: QueryEditorPropertyType.String },
              type: QueryEditorExpressionType.Reduce,
            },
          ],
          type: QueryEditorExpressionType.And,
        },
      },
    };
    const { rerender } = render(<AggregateSection {...defaultProps} query={query} />);
    expect(screen.getByText('foo')).toBeInTheDocument();
    query.expression.from!.property.name = 'other';
    query.expression.reduce.expressions = [];
    rerender(<AggregateSection {...defaultProps} query={query} />);
    expect(screen.queryByText('foo')).not.toBeInTheDocument();
  });
});
