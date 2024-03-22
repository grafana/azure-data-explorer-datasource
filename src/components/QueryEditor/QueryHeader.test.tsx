import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryHeader } from './QueryHeader';
import { openMenu } from 'react-select-event';

import { mockDatasource, mockQuery } from '../__fixtures__/Datasource';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { AdxSchema, defaultQuery } from 'types';

jest.mock('@grafana/runtime', () => {
  const original = jest.requireActual('@grafana/runtime');
  return {
    ...original,
    getTemplateSrv: () => ({
      getVariables: () => [],
      replace: (s: string) => s,
    }),
    reportInteraction: (string, props) => ({}),
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
  templateVariableOptions: [],
};

describe('QueryEditor', () => {
  describe('it is loading the schema', () => {
    it('should render a loading message', async () => {
      const schema: AsyncState<AdxSchema> = { loading: true };
      await waitFor(() => render(<QueryHeader {...defaultProps} schema={schema} />));
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

    it('should select a format by default', async () => {
      const onChange = jest.fn();
      await waitFor(() => render(<QueryHeader {...defaultProps} schema={schema} onChange={onChange} />));
      await waitFor(() => screen.getByText('foo'));
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultFormat: 'table' }));
    });

    it('should select a database by default', async () => {
      const onChange = jest.fn();
      await waitFor(() => render(<QueryHeader {...defaultProps} schema={schema} onChange={onChange} />));
      await waitFor(() => screen.getByText('foo'));
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ database: 'foo' }));
    });

    it('should render with the default database selected', async () => {
      const ds = mockDatasource();
      ds.getDefaultOrFirstDatabase = jest.fn().mockResolvedValue('bar');
      await waitFor(() => render(<QueryHeader {...defaultProps} schema={schema} datasource={ds} />));
      await waitFor(() => screen.getByText('bar'));
    });

    it('should select a database', async () => {
      const onChange = jest.fn();
      await waitFor(() => render(<QueryHeader {...defaultProps} schema={schema} onChange={onChange} />));
      await waitFor(() => screen.getByText('foo'));
      const sel = screen.getByLabelText('Database:');
      openMenu(sel);
      await act(() => screen.getByText('bar').click());
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ database: 'bar', expression: defaultQuery.expression })
      );
    });

    it('should show a warning if switching from raw mode', async () => {
      const onChange = jest.fn();
      const setDirty = jest.fn();
      await waitFor(() =>
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
        )
      );
      const s = await waitFor(() => screen.getByLabelText('Builder'));
      s.click();
      await waitFor(() => screen.getByText('Are you sure?'));
      const b = screen.getByText('Confirm');
      await act(() => b.click());
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rawMode: false }));
      expect(setDirty).toHaveBeenCalledWith(false);
    });

    it('runs a query', async () => {
      const onRunQuery = jest.fn();
      await waitFor(() => render(<QueryHeader {...defaultProps} schema={schema} onRunQuery={onRunQuery} />));
      await waitFor(() => screen.getByText('foo'));
      await act(() => screen.getByText('Run query').click());
      expect(onRunQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('format selector', () => {
    it('should select a format', async () => {
      const onChange = jest.fn();
      await waitFor(() => render(<QueryHeader {...defaultProps} onChange={onChange} />));
      const sel = await waitFor(() => screen.getByLabelText('Format as:'));
      openMenu(sel);
      await act(() => screen.getByText('Time series').click());
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultFormat: 'time_series' }));
    });

    it('should select handle ADX time series format', async () => {
      const onChange = jest.fn();
      let query = { ...defaultProps.query, rawMode: true };
      const { rerender } = render(<QueryHeader {...defaultProps} onChange={onChange} query={query} />);
      const sel = await waitFor(() => screen.getByLabelText('Format as:'));
      openMenu(sel);
      await act(() => screen.getByText('ADX Time series').click());
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultFormat: 'time_series_adx_series' }));
      // simulate change of mode
      query = { ...defaultProps.query, rawMode: false, resultFormat: 'time_series_adx_series' };
      await waitFor(() => rerender(<QueryHeader {...defaultProps} onChange={onChange} query={query} />));
      // it should change to time_series since it's using the visual editor
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultFormat: 'time_series' }));
    });
  });

  describe('kql explanation', () => {
    it('renders the Explain KQL button in raw mode', async () => {
      const onChange = jest.fn();
      await waitFor(() =>
        render(
          <QueryHeader
            {...defaultProps}
            query={{
              ...mockQuery,
              rawMode: true,
            }}
            onChange={onChange}
          />
        )
      );
      expect(screen.getByText('Explain KQL')).toBeInTheDocument();
    });
  });
});
