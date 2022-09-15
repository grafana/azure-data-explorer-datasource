import { render, screen } from '@testing-library/react';
import { QueryEditorExpressionType } from 'components/LegacyQueryEditor/editor/expressions';
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

describe('AggregateSection', () => {
  it('add an aggregation function', () => {
    const onChange = jest.fn();
    render(<AggregateSection {...defaultProps} onChange={onChange} />);
    screen.getByRole('button').click();
    // Select a function
    const sel = screen.getByLabelText('function');
    openMenu(sel);
    screen.getByText(AggregateFunctions.Avg).click();
    // The info is not complete so onChange is called with an empty aggregation
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({ reduce: { expressions: [], type: QueryEditorExpressionType.And } }),
      })
    );
    // Select a column
    const selCol = screen.getByLabelText('column');
    openMenu(selCol);
    screen.getByText('foo').click();
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
