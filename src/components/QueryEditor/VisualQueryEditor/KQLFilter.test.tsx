import { act, render, screen } from '@testing-library/react';
import { QueryEditorExpressionType } from 'types/expressions';
import { mockDatasource, mockQuery } from 'components/__fixtures__/Datasource';
import React from 'react';
import { QueryEditorPropertyType } from 'schema/types';
import KQLFilter from './KQLFilter';

const defaultProps = {
  index: 0,
  datasource: mockDatasource(),
  query: {
    ...mockQuery,
    expression: {
      ...mockQuery.expression,
      where: {
        expressions: [
          {
            expressions: [
              {
                operator: { name: '==', value: 'foo' },
                property: {
                  name: 'ActivityName',
                  type: QueryEditorPropertyType.String,
                },
                type: QueryEditorExpressionType.Operator,
              },
            ],
            type: QueryEditorExpressionType.Or,
          },
        ],
        type: QueryEditorExpressionType.And,
      },
    },
  },
  templateVariableOptions: {},
  onChange: jest.fn(),
};

describe('KQLFilter', () => {
  it('should render a filter', () => {
    render(<KQLFilter {...defaultProps} />);
    expect(screen.getByText('ActivityName')).toBeInTheDocument();
  });

  it('should add a new item', async () => {
    const onChange = jest.fn();
    render(<KQLFilter {...defaultProps} onChange={onChange} />);
    await act(() => screen.getByLabelText('Add').click());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('should remove the filter group when removing the last element', async () => {
    const onChange = jest.fn();
    render(<KQLFilter {...defaultProps} onChange={onChange} />);
    await act(() => screen.getByLabelText('remove').click());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].expression.where.expressions.length).toBe(0);
  });

  it('should update filters if props change', async () => {
    const onChange = jest.fn();
    const query = {
      ...mockQuery,
      expression: {
        ...mockQuery.expression,
        where: {
          expressions: [
            {
              expressions: [
                {
                  operator: { name: '==', value: 'foo' },
                  property: {
                    name: 'ActivityName',
                    type: QueryEditorPropertyType.String,
                  },
                  type: QueryEditorExpressionType.Operator,
                },
              ],
              type: QueryEditorExpressionType.Or,
            },
            {
              expressions: [
                {
                  operator: { name: '==', value: 'bar' },
                  property: {
                    name: 'Other',
                    type: QueryEditorPropertyType.String,
                  },
                  type: QueryEditorExpressionType.Operator,
                },
              ],
              type: QueryEditorExpressionType.Or,
            },
          ],
          type: QueryEditorExpressionType.And,
        },
      },
    };
    const { rerender } = render(<KQLFilter {...defaultProps} onChange={onChange} index={1} query={query} />);
    expect(screen.getByText('Other')).toBeInTheDocument();
    await act(() => screen.getByLabelText('remove').click());
    rerender(<KQLFilter {...defaultProps} onChange={onChange} index={0} query={query} />);
    expect(screen.getByText('ActivityName')).toBeInTheDocument();
  });
});
