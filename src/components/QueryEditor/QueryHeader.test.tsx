import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryHeader } from './QueryHeader';
import { openMenu } from 'react-select-event';

import { mockDatasource, mockQuery } from '../__fixtures__/Datasource';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { AdxSchema } from 'types';

jest.mock('@grafana/runtime', () => {
  const original = jest.requireActual('@grafana/runtime');
  return {
    ...original,
    getTemplateSrv: () => ({
      getVariables: () => [],
      replace: (s: string) => s,
    }),
    config: {
      ...original.config,
      buildInfo: {
        ...original.config.buildInfo,
        version: '8.5.0',
      },
    },
  };
});

const defaultSchema: AsyncState<AdxSchema> = { loading: false };

const defaultProps = {
  onChange: jest.fn(),
  datasource: mockDatasource(),
  query: mockQuery,
  schema: defaultSchema,
};

describe('QueryEditor', () => {
  describe('it is loading the schema', () => {
    it('should render a loading message', async () => {
      const schema: AsyncState<AdxSchema> = { loading: true };
      render(<QueryHeader {...defaultProps} schema={schema} />);
      await waitFor(() => screen.getByTestId('Spinner'));
    });
  });

  describe('when there is a schema', () => {
    const schema: AsyncState<AdxSchema> = {
      loading: false,
      value: {
        Databases: {
          foo: { Name: 'foo', Tables: {}, ExternalTables: {}, Functions: {}, MaterializedViews: {} },
          bar: { Name: 'bar', Tables: {}, ExternalTables: {}, Functions: {}, MaterializedViews: {} },
        },
      },
    };
    it('should render with the default database selected', async () => {
      const ds = mockDatasource();
      ds.getDefaultOrFirstDatabase = jest.fn().mockResolvedValue('bar');
      render(<QueryHeader {...defaultProps} schema={schema} datasource={ds} />);
      await waitFor(() => screen.getByText('bar'));
    });

    it('should select a database', async () => {
      const onChange = jest.fn();
      render(<QueryHeader {...defaultProps} schema={schema} onChange={onChange} />);
      await waitFor(() => screen.getByText('foo'));
      const sel = screen.getByLabelText('Database:');
      openMenu(sel);
      screen.getByText('bar').click();
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ database: 'bar' }));
    });
  });
});
