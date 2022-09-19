import { render, screen } from '@testing-library/react';
import { QueryEditorExpressionType } from 'components/LegacyQueryEditor/editor/expressions';
import { mockDatasource, mockQuery } from 'components/__fixtures__/Datasource';
import React from 'react';
import { QueryEditorPropertyType } from 'schema/types';
import FilterSection from './FilterSection';

const defaultProps = {
  datasource: mockDatasource(),
  query: mockQuery,
  templateVariableOptions: {},
  columns: [{ Name: 'foo', CslType: 'string' }],
  database: 'db',
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
};

describe('FilterSection', () => {
  it('should render a filter group per where expression', () => {
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
                    name: 'ID',
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
    render(<FilterSection {...defaultProps} query={query} />);
    expect(screen.getAllByText('Filter group')).toHaveLength(2);
  });

  it('should add a filter group', () => {
    const onChange = jest.fn();
    render(<FilterSection {...defaultProps} onChange={onChange} />);
    const b = screen.getByRole('button');
    b.click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({
          where: { expressions: [{ expressions: [{ expressions: [], type: 'or' }], type: 'or' }], type: 'and' },
        }),
      })
    );
  });
});
