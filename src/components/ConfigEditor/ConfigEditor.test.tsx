import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import ConfigEditor from './index';
import { EditorMode } from 'types';
import * as refreshSchema from './refreshSchema';
import * as grafanaRuntime from '@grafana/runtime';
import { AdxDataSource } from 'datasource';

describe('ConfigEditor', () => {
  let refreshSchemaSpy;

  beforeEach(() => {
    refreshSchemaSpy = jest
      .spyOn(refreshSchema, 'refreshSchema')
      .mockImplementation((datasource: AdxDataSource) => Promise.resolve({ databases: [], schemaMappingOptions: [] }));

    jest.spyOn(grafanaRuntime, 'getDataSourceSrv').mockImplementation(
      () =>
        ({
          get: () => Promise.resolve({ url: 'somestring' }),
          getList: () => {},
          getInstanceSettings: () => {},
        } as any)
    );
  });

  afterEach(() => {
    refreshSchemaSpy.mockRestore();
  });

  it('renders the component', async () => {
    render(<ConfigEditor {...createMockConfigEditorProps()} />);
    await waitFor(() => expect(screen.getByTestId('azure-data-explorer-config-editor')).toBeInTheDocument());
  });

  it('calls refreshSchema on render', async () => {
    render(<ConfigEditor {...createMockConfigEditorProps()} />);
    await waitFor(() => expect(screen.getByTestId('azure-data-explorer-config-editor')).toBeInTheDocument());
    expect(refreshSchemaSpy).toHaveBeenCalledTimes(1);
  });

  it('calls refreshSchema on click of "Reload schema" button', async () => {
    render(<ConfigEditor {...createMockConfigEditorProps()} />);
    await waitFor(() => {
      expect(screen.getByTestId('azure-data-explorer-config-editor')).toBeInTheDocument();
      const button = screen.getByText('Reload schema');
      userEvent.click(button);
    });
    expect(refreshSchemaSpy).toHaveBeenCalledTimes(2);
  });
});

const createMockConfigEditorProps = (optionsOverrides?: any) => ({
  options: {
    id: 123,
    orgId: 123,
    name: '',
    typeLogoUrl: '',
    type: '',
    access: '',
    url: '',
    password: '',
    user: '',
    database: '',
    basicAuth: true,
    basicAuthPassword: '',
    basicAuthUser: '',
    isDefault: true,
    jsonData: {
      readOnly: true,
      withCredentials: true,
      defaultDatabase: '',
      minimalCache: 123,
      defaultEditorMode: EditorMode.Raw,
      queryTimeout: '',
      dataConsistency: '',
      cacheMaxAge: '',
      dynamicCaching: true,
      useSchemaMapping: false,
      enableUserTracking: true,
      clusterUrl: '',
      tenantId: '',
      clientId: '',
    },
    readOnly: true,
    withCredentials: true,
    defaultDatabase: '',
    minimalCache: 123,
    defaultEditorMode: EditorMode.Raw,
    queryTimeout: '',
    dataConsistency: '',
    cacheMaxAge: '',
    dynamicCaching: true,
    useSchemaMapping: false,
    enableUserTracking: true,
    clusterUrl: '',
    tenantId: '',
    clientId: '',
    secureJsonFields: {
      someAuthStuff: '',
    },
    ...optionsOverrides,
  },
  onOptionsChange: () => {},
});
