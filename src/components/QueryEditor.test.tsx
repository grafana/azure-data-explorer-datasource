import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryEditor } from './QueryEditor';

import { mockDatasource, mockQuery } from './__fixtures__/Datasource';

// jest.mock('../monaco/KustoMonacoEditor', () => {
//   return {
//     KustoMonacoEditor: function C() {
//       return <></>;
//     },
//   };
// });

let mockedRuntime;
jest.mock('@grafana/runtime', () => {
  const original = jest.requireActual('@grafana/runtime');
  mockedRuntime = {
    ...original,
    getTemplateSrv: () => ({
      getVariables: () => [],
      replace: (s: string) => s,
    }),
  };
  mockedRuntime.config.buildInfo.version = '8.5.0';

  return mockedRuntime;
});

const defaultProps = {
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
  datasource: mockDatasource,
  query: mockQuery,
};

describe('QueryEditor', () => {
  describe('it is loading the schema', () => {
    it('should render a loading message', () => {
      render(<QueryEditor {...defaultProps} />);
      expect(screen.getByText(/your schema is loading/i)).toBeInTheDocument();
    });
  });

  describe('there is a schema error', () => {
    const getSchema = mockDatasource.getSchema;
    beforeEach(() => {
      mockDatasource.getSchema = getSchema;
    });

    it('should render the encoded message', async () => {
      mockDatasource.getSchema = jest.fn().mockRejectedValue({
        data: {
          Message: 'Boom!',
        },
      });
      render(<QueryEditor {...defaultProps} />);
      await waitFor(() => screen.getByText('Could not load datasource schema due too: Boom!'));
    });

    it('should render the error', async () => {
      mockDatasource.getSchema = jest.fn().mockRejectedValue('Boom!');
      render(<QueryEditor {...defaultProps} />);
      await waitFor(() => screen.getByText('Could not load datasource schema: Boom!'));
    });
  });

  describe('when there is a schema', () => {
    it('should render a no databases warning', async () => {
      mockDatasource.getSchema = jest.fn().mockResolvedValue({});
      render(<QueryEditor {...defaultProps} />);
      await waitFor(() => screen.getByText(/Datasource schema loaded but without any databases/i));
    });

    it('should render a visual editor', async () => {
      mockDatasource.getSchema = jest.fn().mockResolvedValue({
        Databases: {
          foo: {},
        },
      });
      render(<QueryEditor {...defaultProps} />);
      await waitFor(() => screen.getByText(/Table schema loaded successfully but without any columns/i));
    });

    it('should render a raw editor', async () => {
      mockDatasource.getSchema = jest.fn().mockResolvedValue({
        Databases: {
          foo: {},
        },
      });
      render(<QueryEditor {...defaultProps} query={{ ...defaultProps.query, rawMode: true }} />);
      await waitFor(() => screen.getByText(/Raw Query/i));
    });
  });
});
