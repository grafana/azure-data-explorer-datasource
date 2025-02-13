import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import { openMenu } from 'react-select-event';
import VariableEditor, { VariableProps } from './VariableEditor';
import { AdxQueryType, EditorMode, KustoQuery, defaultQuery } from 'types';
import { mockDatasource } from 'components/__fixtures__/Datasource';
import { AdxSchemaResolver } from 'schema/AdxSchemaResolver';

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

const createDefaultQuery = (overrides?: Partial<KustoQuery>): KustoQuery => ({
  ...defaultQuery,
  database: '',
  resultFormat: 'table',
  refId: '',
  clusterUri: '',
  ...overrides,
});

const defaultProps = (overrides?: Partial<VariableProps>): VariableProps => {
  const datasource = mockDatasource();
  datasource.getClusters = jest.fn().mockResolvedValue([{ name: 'cluster_name', value: 'cluster_value' }]);
  datasource.getDatabases = jest.fn().mockResolvedValue([{ text: 'test_db', value: 'test_db' }]);
  datasource.getSchema = jest.fn().mockResolvedValue([]);
  return {
    query: createDefaultQuery(overrides?.query),
    onChange: jest.fn(),
    datasource,
    ...overrides,
  };
};

describe('VariableEditor', () => {
  it('should render the VariableEditor', async () => {
    await waitFor(async () => {
      render(<VariableEditor {...defaultProps()} />);
      await screen.getByText('Query Type');
    });
  });

  it('will migrate a legacy database variable query', async () => {
    const props = defaultProps();
    const migratedQuery = {
      ...defaultQuery,
      query: 'databases()',
      refId: `adx-databases()`,
      querySource: EditorMode.Raw,
      database: '',
      resultFormat: 'table',
      rawMode: true,
      pluginVersion: defaultQuery.pluginVersion,
      expression: defaultQuery.expression,
      queryType: AdxQueryType.Databases,
      clusterUri: '',
    };
    await waitFor(async () => {
      render(<VariableEditor {...props} query={'databases()' as any} />);
    });
    expect(props.onChange).toHaveBeenCalled();
    expect(props.onChange).toHaveBeenCalledWith(migratedQuery);
  });

  it('will render the builder for KQL query type', async () => {
    render(<VariableEditor {...defaultProps()} />);

    await waitFor(() => screen.getByText('Run query'));
  });

  it('will run cluster query', async () => {
    const props = defaultProps();
    const { rerender } = render(<VariableEditor {...props} />);
    await waitFor(async () => {
      await screen.getByLabelText('select query type');
      const querySelector = await screen.getByLabelText('select query type');
      act(() => openMenu(querySelector));

      (await screen.getByText('Clusters')).click();
      const newQuery = { ...props.query, queryType: AdxQueryType.Clusters };
      rerender(<VariableEditor {...props} query={newQuery} />);
    });

    expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({ queryType: AdxQueryType.Clusters }));
    expect(props.datasource.getClusters).toHaveBeenCalled();
  });

  it('will run database query', async () => {
    const props = defaultProps();
    const { rerender } = render(<VariableEditor {...props} />);
    await waitFor(async () => {
      await screen.getByLabelText('select query type');
      const querySelector = await screen.getByLabelText('select query type');
      act(() => openMenu(querySelector));
      (await screen.getByText('Databases')).click();
      const newQuery = { ...props.query, queryType: AdxQueryType.Databases };
      rerender(<VariableEditor {...props} query={newQuery} />);
    });

    expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({ queryType: AdxQueryType.Databases }));
    expect(props.datasource.getDatabases).toHaveBeenCalled();
  });

  it('will run tables query', async () => {
    const props = defaultProps();
    props.query = '' as any;
    const { rerender } = render(<VariableEditor {...props} />);
    await waitFor(async () => {
      await screen.getByLabelText('select query type');
      const querySelector = await screen.getByLabelText('select query type');
      act(() => openMenu(querySelector));
      (await screen.getByText('Tables')).click();
      const newQuery = { ...props.query, queryType: AdxQueryType.Tables };
      rerender(<VariableEditor {...props} query={newQuery} />);
      const databasesSelector = await screen.getByLabelText('select database');
      act(() => openMenu(databasesSelector));
      (await screen.getByText('test_db')).click();
      const newerQuery = { ...props.query, database: 'test_db' };
      rerender(<VariableEditor {...props} query={newerQuery} />);
    });

    expect(props.onChange).toHaveBeenNthCalledWith(1, expect.objectContaining({ queryType: AdxQueryType.Tables }));
    expect(props.datasource.getDatabases).toHaveBeenCalled();
    expect(props.onChange).toHaveBeenNthCalledWith(2, expect.objectContaining({ database: 'test_db' }));
  });

  it('will run columns query', async () => {
    const getTablesForDatabaseMock = jest.spyOn(AdxSchemaResolver.prototype, 'getTablesForDatabase').mockResolvedValue([
      {
        Name: 'test_table',
        OrderedColumns: [
          {
            Name: 'test_column',
            Type: 'System.Int64',
            CslType: 'long',
          },
        ],
      },
    ]);
    const props = defaultProps();
    props.query = '' as any;
    const { rerender } = render(<VariableEditor {...props} />);
    await waitFor(async () => {
      const querySelector = await screen.getByLabelText('select query type');
      act(() => openMenu(querySelector));
      (await screen.getByText('Columns')).click();
      const newQuery = { ...props.query, queryType: AdxQueryType.Columns };
      rerender(<VariableEditor {...props} query={newQuery} />);
      const databasesSelector = await screen.getByLabelText('select database');
      act(() => openMenu(databasesSelector));
      (await screen.getByText('test_db')).click();
      const newerQuery = { ...props.query, queryType: AdxQueryType.Columns, database: 'test_db' };
      rerender(<VariableEditor {...props} query={newerQuery} />);
      const tablesSelector = await screen.getByLabelText('select table');
      act(() => openMenu(tablesSelector));
      (await screen.getByText('test_table')).click();
      const newestQuery = { ...props.query, queryType: AdxQueryType.Columns, database: 'test_db', table: 'test_table' };
      rerender(<VariableEditor {...props} query={newestQuery} />);
    });

    expect(props.onChange).toHaveBeenNthCalledWith(1, expect.objectContaining({ queryType: AdxQueryType.Columns }));
    expect(props.datasource.getDatabases).toHaveBeenCalled();
    expect(props.onChange).toHaveBeenNthCalledWith(2, expect.objectContaining({ database: 'test_db' }));
    expect(getTablesForDatabaseMock).toHaveBeenCalled();
    expect(props.onChange).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        table: 'test_table',
      })
    );
  });
});
