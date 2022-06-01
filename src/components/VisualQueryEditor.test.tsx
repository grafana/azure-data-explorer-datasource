import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { VisualQueryEditor } from './VisualQueryEditor';
import { mockDatasource, mockQuery } from './__fixtures__/Datasource';

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
  onChangeQuery: jest.fn(),
  datasource: mockDatasource,
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
  xit('should render the VisualQueryEditor', async () => {
    render(<VisualQueryEditor {...defaultProps} />);
    await waitFor(() => screen.getByText('Table schema loaded successfully but without any columns'));
  });

  it('should render the VisualQueryEditor with a schema', async () => {
    const datasource = mockDatasource;
    datasource.getSchema = jest.fn().mockResolvedValue(schema);
    render(<VisualQueryEditor {...defaultProps} datasource={datasource} database="foo" schema={schema} />);
    await waitFor(() => screen.getByText('bar'));
  });
});
