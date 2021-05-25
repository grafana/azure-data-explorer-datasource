import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import ConfigEditor from './index';
import { EditorMode } from 'types';
import * as refreshSchema from './refreshSchema';

describe('ConfigEditor', () => {
  let refreshSchemaSpy;

  beforeEach(() => {
    refreshSchemaSpy = jest
      .spyOn(refreshSchema, 'refreshSchema')
      .mockImplementation((url: string) => Promise.resolve({ databases: [], schemaMappingOptions: [] }));
  });

  afterEach(() => {
    refreshSchemaSpy.mockRestore();
  });

  it('renders the component', async () => {
    render(<ConfigEditor {...createMockConfigEditorProps()} />);
    await waitFor(() => expect(screen.getByTestId('azure-data-explorer-config-editor')).toBeInTheDocument());
  });

  it('calls refreshSchema on render if id and url are defined', async () => {
    render(<ConfigEditor {...createMockConfigEditorProps({ id: 123, url: 'grafana.com' })} />);
    await waitFor(() => expect(screen.getByTestId('azure-data-explorer-config-editor')).toBeInTheDocument());
    expect(refreshSchemaSpy).toHaveBeenCalled();
  });

  it('does not call refreshSchema on render if the id or url are missing', async () => {
    render(<ConfigEditor {...createMockConfigEditorProps({ id: 123, url: '' })} />);
    await waitFor(() => expect(screen.getByTestId('azure-data-explorer-config-editor')).toBeInTheDocument());
    expect(refreshSchemaSpy).not.toHaveBeenCalled();
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
    ...optionsOverrides,
  },
  onOptionsChange: () => {},
});
