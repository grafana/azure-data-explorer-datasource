import { mockDatasource, mockQuery } from 'components/__fixtures__/Datasource';
import React from 'react';
import { QueryEditor } from './QueryEditor';
import { render, screen, waitFor } from '@testing-library/react';
import { AdxQueryType, defaultQuery, EditorMode } from 'types';

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
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
  datasource: mockDatasource(),
  query: mockQuery,
};

describe('QueryEditor', () => {
  describe('on first load', () => {
    it('should migrate a query ', async () => {
      const onChange = jest.fn();
      const ds = mockDatasource();
      ds.getClusters = jest.fn().mockResolvedValue([]);
      const query = { ...mockQuery, pluginVersion: '', queryType: '' as AdxQueryType };
      render(<QueryEditor {...defaultProps} onChange={onChange} query={query} datasource={ds} />);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ pluginVersion: defaultQuery.pluginVersion }));
      // wait to load
      await waitFor(() => screen.getByText('Could not load datasource schema'));
    });

    it('should set the default raw mode', async () => {
      const onChange = jest.fn();
      const query = { ...mockQuery, rawMode: undefined };
      const ds = mockDatasource();
      ds.getDefaultEditorMode = jest.fn().mockReturnValue(EditorMode.Raw);
      ds.getClusters = jest.fn().mockResolvedValue([]);
      render(<QueryEditor {...defaultProps} onChange={onChange} query={query} datasource={ds} />);
      expect(ds.getDefaultEditorMode).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rawMode: true }));
      // wait to load
      await waitFor(() => screen.getByText('Could not load datasource schema'));
    });
  });
  describe('there is a schema error', () => {
    const getSchema = defaultProps.datasource.getSchema;
    beforeEach(() => {
      defaultProps.datasource.getSchema = getSchema;
    });

    it('should render the encoded message', async () => {
      const ds = mockDatasource();
      ds.getSchema = jest.fn().mockRejectedValue({
        data: {
          Message: 'Boom!',
        },
      });
      ds.getClusters = jest.fn().mockResolvedValue([]);
      render(<QueryEditor {...defaultProps} datasource={ds} />);
      await waitFor(() => screen.getByText('Could not load datasource schema'));
      await waitFor(() => screen.getByText('Boom!'));
    });

    it('should render the error', async () => {
      const ds = mockDatasource();
      ds.getClusters = jest.fn().mockResolvedValue([]);
      ds.getSchema = jest.fn().mockRejectedValue('Boom!');
      render(<QueryEditor {...defaultProps} datasource={ds} />);
      await waitFor(() => screen.getByText('Could not load datasource schema'));
      await waitFor(() => screen.getByText('Boom!'));
    });
  });
});
