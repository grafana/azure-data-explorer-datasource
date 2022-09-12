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
  dirty: false,
  setDirty: jest.fn(),
  onRunQuery: jest.fn(),
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

    it('should show a warning if switching from raw mode', async () => {
      const onChange = jest.fn();
      const setDirty = jest.fn();
      render(
        <QueryHeader
          {...defaultProps}
          query={{
            ...mockQuery,
            rawMode: true,
          }}
          schema={schema}
          onChange={onChange}
          dirty={true}
          setDirty={setDirty}
        />
      );
      const s = await waitFor(() => screen.getByLabelText('Builder'));
      s.click();
      await waitFor(() => screen.getByText('Are you sure?'));
      const b = screen.getByText('Confirm');
      b.click();
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rawMode: false }));
      expect(setDirty).toHaveBeenCalledWith(false);
    });

    it('runs a query', async () => {
      const onRunQuery = jest.fn();
      render(<QueryHeader {...defaultProps} schema={schema} onRunQuery={onRunQuery} />);
      await waitFor(() => screen.getByText('foo'));
      screen.getByText('Run query').click();
      expect(onRunQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('format selector', () => {
    it('should select a format', async () => {
      const onChange = jest.fn();
      render(<QueryHeader {...defaultProps} onChange={onChange} />);
      const sel = await waitFor(() => screen.getByLabelText('Format as:'));
      openMenu(sel);
      screen.getByText('Time series').click();
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultFormat: 'time_series' }));
    });

    it('should select handle ADX time series format', async () => {
      const onChange = jest.fn();
      let query = { ...defaultProps.query, rawMode: true };
      const { rerender } = render(<QueryHeader {...defaultProps} onChange={onChange} query={query} />);
      const sel = await waitFor(() => screen.getByLabelText('Format as:'));
      openMenu(sel);
      screen.getByText('ADX Time series').click();
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultFormat: 'time_series_adx_series' }));
      // simulate change of mode
      query = { ...defaultProps.query, rawMode: false, resultFormat: 'time_series_adx_series' };
      rerender(<QueryHeader {...defaultProps} onChange={onChange} query={query} />);
      // it should change to time_series since it's using the visual editor
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultFormat: 'time_series' }));
    });
  });
});
