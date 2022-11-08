import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { VisualQueryEditor } from './VisualQueryEditor';
import { mockDatasource, mockQuery } from '../__fixtures__/Datasource';
import { QueryEditorPropertyType } from 'schema/types';
import { QueryEditorExpressionType } from 'components/LegacyQueryEditor/editor/expressions';
import { openMenu } from 'react-select-event';

jest.mock('@grafana/runtime', () => {
  const original = jest.requireActual('@grafana/runtime');
  return {
    ...original,
    getTemplateSrv: () => ({
      getVariables: () => [],
      replace: (s: string) => s,
    }),
  };
});

const defaultProps = {
  database: '',
  query: mockQuery,
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
  datasource: mockDatasource(),
  templateVariableOptions: {},
};

const schema = {
  Databases: {
    foo: {
      Name: 'foo',
      Tables: {
        bar: {
          Name: 'bar',
          OrderedColumns: [
            {
              Name: 'foobar',
              CslType: 'string',
            },
            {
              Name: 'barfoo',
              CslType: 'string',
            },
          ],
        },
      },
      ExternalTables: {},
      Functions: {},
      MaterializedViews: {},
    },
  },
};

describe('VisualQueryEditor', () => {
  it('should render the VisualQueryEditor', async () => {
    render(<VisualQueryEditor {...defaultProps} schema={{ Databases: {} }} />);
    await waitFor(() => screen.getByText('Table schema loaded successfully but without any columns'));
  });

  it('should render the VisualQueryEditor with a schema', async () => {
    const datasource = mockDatasource();
    const onChange = jest.fn();
    datasource.getSchema = jest.fn().mockResolvedValue(schema);
    render(
      <VisualQueryEditor {...defaultProps} datasource={datasource} database="foo" schema={schema} onChange={onChange} />
    );
    await waitFor(() => screen.getByText('bar'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({
          from: {
            property: { name: 'bar', type: QueryEditorPropertyType.String },
            type: QueryEditorExpressionType.Property,
          },
        }),
      })
    );
  });

  it('selecting a column should remove the rest from other selectors', async () => {
    const datasource = mockDatasource();
    const onChange = jest.fn();
    datasource.getSchema = jest.fn().mockResolvedValue(schema);
    const { rerender } = render(
      <VisualQueryEditor {...defaultProps} datasource={datasource} database="foo" schema={schema} onChange={onChange} />
    );
    await waitFor(() => screen.getByText('bar'));
    const sel = screen.getByLabelText('Columns');
    openMenu(sel);
    screen.getByText('foobar').click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.objectContaining({
          columns: {
            columns: ['foobar'],
            type: QueryEditorExpressionType.Property,
          },
        }),
      })
    );
    // simulate update
    rerender(
      <VisualQueryEditor
        {...defaultProps}
        datasource={datasource}
        database="foo"
        schema={schema}
        onChange={onChange}
        query={onChange.mock.calls[onChange.mock.calls.length - 1][0]}
      />
    );
    // Add a section
    const as = screen.getByTestId('aggregate-section');
    within(as).getByRole('button').click();
    const selCol = within(as).getByLabelText('column');
    openMenu(selCol);
    // The column is now displayed in the both selectors
    expect(screen.getAllByText('foobar')).toHaveLength(2);
    // But the other column is not
    expect(screen.queryByText('barfoo')).not.toBeInTheDocument();
  });
});
