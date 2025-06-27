import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryHeader } from './QueryHeader';
import { openMenu } from 'react-select-event';

import { mockDatasource, mockQuery } from '../__fixtures__/Datasource';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { defaultQuery } from 'types';
import { DatabaseItem } from 'response_parser';

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

const defaultProps = {
  onChange: jest.fn(),
  datasource: mockDatasource(),
  query: mockQuery,
  dirty: false,
  setDirty: jest.fn(),
  onRunQuery: jest.fn(),
  templateVariableOptions: [],
};

describe('QueryEditor', () => {
  describe('it is loading the databases', () => {
    it('should render a loading message', async () => {
      const databases: AsyncState<DatabaseItem[]> = { loading: true };
      await waitFor(() => render(<QueryHeader {...defaultProps} databases={databases} />));
      await waitFor(() => screen.getByTestId('Spinner'));
    });
  });
  const databases: AsyncState<DatabaseItem[]> = {
    loading: false,
    value: [
      { text: 'foo', value: 'foo' },
      { text: 'bar', value: 'bar' },
    ],
  };

  describe('when there are databases', () => {
    it('should select a format by default', async () => {
      const onChange = jest.fn();
      await waitFor(() => render(<QueryHeader {...defaultProps} databases={databases} onChange={onChange} />));
      await waitFor(() => screen.getByText('foo'));
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultFormat: 'table' }));
    });

    it('should select a database by default', async () => {
      const onChange = jest.fn();
      await waitFor(() => render(<QueryHeader {...defaultProps} databases={databases} onChange={onChange} />));
      await waitFor(() => screen.getByText('foo'));
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ database: 'foo' }));
    });

    it('should render with the default database selected', async () => {
      const ds = mockDatasource();
      ds.getDefaultOrFirstDatabase = jest.fn().mockResolvedValue('bar');
      await waitFor(() => render(<QueryHeader {...defaultProps} databases={databases} datasource={ds} />));
      await waitFor(() => screen.getByText('bar'));
    });

    it('should select a database', async () => {
      const onChange = jest.fn();
      await waitFor(async () => {
        render(<QueryHeader {...defaultProps} databases={databases} onChange={onChange} />);

        await screen.getByText('foo');
        const sel = await screen.getByLabelText('Database:');
        act(() => openMenu(sel));
        (await screen.getByText('bar')).click();
      });
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
            databases={databases}
            onChange={onChange}
            dirty={true}
            setDirty={setDirty}
          />
        )
      );
      await waitFor(async () => {
        (await screen.getByLabelText('Builder')).click();
        await screen.getByText('Are you sure?');
        (await screen.getByText('Confirm')).click();
      });
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rawMode: false }));
      expect(setDirty).toHaveBeenCalledWith(false);
    });

    it('runs a query', async () => {
      const onRunQuery = jest.fn();
      await waitFor(async () => {
        render(<QueryHeader {...defaultProps} databases={databases} onRunQuery={onRunQuery} />);
        screen.getByText('foo');
        (await screen.getByText('Run query')).click();
      });
      expect(onRunQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('format selector', () => {
    it('should select a format', async () => {
      const onChange = jest.fn();
      await waitFor(async () => {
        render(<QueryHeader {...defaultProps} onChange={onChange} databases={databases} />);
        const sel = await screen.getByLabelText('Format as:');
        act(() => openMenu(sel));
        (await screen.getByText('Time series')).click();
      });
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultFormat: 'time_series' }));
    });

    it('should select handle ADX time series format', async () => {
      const onChange = jest.fn();
      let query = { ...defaultProps.query, rawMode: true };
      const { rerender } = render(
        <QueryHeader {...defaultProps} onChange={onChange} query={query} databases={databases} />
      );
      await waitFor(async () => {
        const sel = await screen.getByLabelText('Format as:');
        act(() => openMenu(sel));
        (await screen.getByText('ADX Time series')).click();
      });
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resultFormat: 'time_series_adx_series' }));
      // simulate change of mode
      query = { ...defaultProps.query, rawMode: false, resultFormat: 'time_series_adx_series' };
      await waitFor(() =>
        rerender(<QueryHeader {...defaultProps} onChange={onChange} query={query} databases={databases} />)
      );
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
            databases={databases}
          />
        )
      );
      expect(screen.getByText('Explain KQL')).toBeInTheDocument();
    });
  });
});
