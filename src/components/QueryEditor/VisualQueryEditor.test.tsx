import { act, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { VisualQueryEditor } from './VisualQueryEditor';
import { mockDatasource, mockQuery } from '../__fixtures__/Datasource';
import { QueryEditorPropertyType } from 'schema/types';
import { QueryEditorExpressionType } from 'types/expressions';
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
  query: { ...mockQuery, clusterUri: 'clusterUri' },
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

const schemaNoColumns = {
  Databases: {
    foo: {
      Name: 'foo',
      Tables: {
        bar: {
          Name: 'bar',
          OrderedColumns: [],
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
    await waitFor(() => screen.findByLabelText('Table'));
  });

  it('should render the VisualQueryEditor and display error if no columns are available', async () => {
    const datasource = mockDatasource();
    const onChange = jest.fn();
    datasource.getSchema = jest.fn().mockResolvedValue(schemaNoColumns);
    const { rerender } = render(
      <VisualQueryEditor
        {...defaultProps}
        datasource={datasource}
        query={{ ...defaultProps.query, clusterUri: 'test-clusterURI' }}
        database="foo"
        schema={schema}
        onChange={onChange}
      />
    );

    await waitFor(async () => {
      const tableSelect = await screen.findByLabelText('Table');
      act(() => openMenu(tableSelect));
      (await screen.findByText('bar')).click();

      rerender(
        <VisualQueryEditor
          {...defaultProps}
          datasource={datasource}
          database="foo"
          schema={schema}
          query={onChange.mock.calls[onChange.mock.calls.length - 1][0]}
          onChange={onChange}
        />
      );
    });
    await waitFor(() => screen.getByText('Table schema loaded successfully but without any columns'));
  });

  it('should render the VisualQueryEditor with a schema', async () => {
    const datasource = mockDatasource();
    const onChange = jest.fn();
    datasource.getSchema = jest.fn().mockResolvedValue(schema);
    render(
      <VisualQueryEditor {...defaultProps} datasource={datasource} database="foo" schema={schema} onChange={onChange} />
    );

    const tableSelect = await screen.findByLabelText('Table');
    act(() => openMenu(tableSelect));
    await screen.findByText('bar');
    expect(document.body).not.toHaveTextContent('Could not load table schema');
  });

  it('selecting a column should remove the rest from other selectors', async () => {
    const datasource = mockDatasource();
    const onChange = jest.fn();
    datasource.getSchema = jest.fn().mockResolvedValue(schema);
    const { rerender } = render(
      <VisualQueryEditor {...defaultProps} datasource={datasource} database="foo" schema={schema} onChange={onChange} />
    );

    await waitFor(async () => {
      const tableSelect = await screen.getByLabelText('Table');
      act(() => openMenu(tableSelect));
      (await screen.findByText('bar')).click();

      rerender(
        <VisualQueryEditor
          {...defaultProps}
          datasource={datasource}
          database="foo"
          schema={schema}
          query={onChange.mock.calls[onChange.mock.calls.length - 1][0]}
          onChange={onChange}
        />
      );
    });
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

    const sel = await screen.findByLabelText('Columns');
    act(() => openMenu(sel));
    await waitFor(async () => (await screen.findByText('foobar')).click());
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
    const as = screen.getByTestId('aggregate-section');
    await waitFor(async () => {
      // Add a section
      (await within(as).findByLabelText('Add')).click();
    });
    const selCol = await within(as).findByLabelText('column');
    act(() => openMenu(selCol));
    // The column is now displayed in the both selectors
    expect(screen.getAllByText('foobar')).toHaveLength(2);
    // But the other column is not
    expect(screen.queryByText('barfoo')).not.toBeInTheDocument();
  });

  it('should not call onChange when loading the editor', async () => {
    const datasource = mockDatasource();
    const onChange = jest.fn();
    datasource.getSchema = jest.fn().mockResolvedValue(schema);
    render(
      <VisualQueryEditor {...defaultProps} datasource={datasource} database="foo" schema={schema} onChange={onChange} />
    );
    await waitFor(() => screen.getByText('Table'));
    expect(onChange).toHaveBeenCalledTimes(0);
  });
});
