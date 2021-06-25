import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigEditor from './index';
import * as refreshSchema from './refreshSchema';
import * as grafanaRuntime from '@grafana/runtime';
import { Chance } from 'chance';
import { mockConfigEditorProps } from 'components/__fixtures__/ConfigEditor.fixtures';

describe('ConfigEditor', () => {
  let refreshSchemaSpy: jest.SpyInstance;

  beforeEach(() => {
    refreshSchemaSpy = jest
      .spyOn(refreshSchema, 'refreshSchema')
      .mockResolvedValue({ databases: [], schemaMappingOptions: [] });

    jest.spyOn(grafanaRuntime, 'getDataSourceSrv').mockReturnValue({
      get: jest.fn().mockReturnValue({ url: Chance().url() }),
      getList: jest.fn(),
      getInstanceSettings: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the component', async () => {
    await waitFor(() => render(<ConfigEditor {...mockConfigEditorProps()} />));

    expect(screen.getByTestId('azure-data-explorer-config-editor')).toBeInTheDocument();
  });

  it('calls refreshSchema on render', async () => {
    await waitFor(() => render(<ConfigEditor {...mockConfigEditorProps()} />));

    expect(refreshSchemaSpy).toHaveBeenCalledTimes(1);
  });

  it('calls refreshSchema on click of "Reload schema" button', async () => {
    await waitFor(() => {
      render(<ConfigEditor {...mockConfigEditorProps()} />);
      userEvent.click(screen.getByRole('button', { name: 'Reload schema' }));
    });

    expect(refreshSchemaSpy).toHaveBeenCalledTimes(2);
  });
});
