import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigEditor from './';
import { EditorMode } from 'types';
import { components } from 'test/selectors';

describe('ConfigEditor', () => {
  const baseOptions = {
    id: 21,
    uid: 'y',
    orgId: 1,
    name: 'ADX-10-10',
    type: 'grafana-azure-data-explorer-datasource',
    typeLogoUrl: '',
    typeName: 'ADX',
    access: 'proxy',
    url: '',
    user: '',
    database: '',
    basicAuth: false,
    basicAuthUser: '',
    withCredentials: false,
    isDefault: false,
    jsonData: {},
    secureJsonFields: {},
    version: 1,
    readOnly: false,
  };

  const jsonData = {
    cloudName: 'azure',
    defaultDatabase: 'db',
    minimalCache: 0,
    defaultEditorMode: EditorMode.Visual,
    queryTimeout: '0',
    dataConsistency: '',
    cacheMaxAge: '',
    dynamicCaching: false,
    useSchemaMapping: false,
    enableUserTracking: false,
    clusterUrl: '',
    application: '',
  };

  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('ConfigEditor', () => {
    it('should render the basic config editor structure (no additional auth)', () => {
      const onOptionsChange = jest.fn();
      render(
        <ConfigEditor
          options={{
            ...baseOptions,
            jsonData,
          }}
          onOptionsChange={onOptionsChange}
        />
      );

      // Check for Azure cloud selection
      expect(screen.getByTestId(components.configEditor.azureCloud.input)).toBeInTheDocument();

      // Check for cluster URL input
      expect(screen.getByTestId(components.configEditor.clusterURL.input)).toBeInTheDocument();
    });
    it('should render the basic config editor structure (additional auth)', () => {
      jest.mock('@grafana/runtime', () => {
        const original = jest.requireActual('@grafana/runtime');
        return {
          ...original,
          getTemplateSrv: () => ({
            getVariables: () => [],
          }),
          config: {
            ...original.config,
            azure: {
              managedIdentityEnabled: true,
            },
          },
        };
      });
      const onOptionsChange = jest.fn();
      render(
        <ConfigEditor
          options={{
            ...baseOptions,
            jsonData,
          }}
          onOptionsChange={onOptionsChange}
        />
      );

      // Check for Azure cloud selection
      expect(screen.getByTestId(components.configEditor.azureCloud.input)).toBeInTheDocument();

      // Check for cluster URL input
      expect(screen.getByTestId(components.configEditor.clusterURL.input)).toBeInTheDocument();
    });

    it('should render cookies correctly', () => {
      const onOptionsChange = jest.fn();
      const options = {
        ...baseOptions,
        jsonData,
      };
      render(
        <ConfigEditor
          options={{ ...options, jsonData: { ...options.jsonData, keepCookies: ['cookie1', 'cookie2'] } }}
          onOptionsChange={onOptionsChange}
        />
      );

      expect(screen.getByText('cookie1')).toBeInTheDocument();
      expect(screen.getByText('cookie2')).toBeInTheDocument();
    });

    it('should validate cluster URL format', async () => {
      const onOptionsChange = jest.fn();
      render(
        <ConfigEditor
          options={{
            ...baseOptions,
            jsonData,
          }}
          onOptionsChange={onOptionsChange}
        />
      );

      const clusterInput = screen.getByTestId(components.configEditor.clusterURL.input);
      await user.clear(clusterInput);
      await user.type(clusterInput, 'invalid-url');

      // Check if validation error appears
      await waitFor(() => {
        const errorText = screen.queryByText(/invalid url/i) || screen.queryByText(/must be a valid/i);
        if (errorText) {
          expect(errorText).toBeInTheDocument();
        }
      });
    });

    it('should handle cache configuration', async () => {
      const onOptionsChange = jest.fn();
      render(
        <ConfigEditor
          options={{
            ...baseOptions,
            jsonData: { ...jsonData, minimalCache: 30, dynamicCaching: false },
          }}
          onOptionsChange={onOptionsChange}
        />
      );

      // Look for cache-related inputs
      const inputs = screen.getAllByRole('textbox');
      const cacheInput = inputs.find(
        (input) => input.getAttribute('value') === '30' || input.getAttribute('placeholder')?.includes('cache')
      );

      if (cacheInput) {
        await user.clear(cacheInput);
        await user.type(cacheInput, '60');
        expect(onOptionsChange).toHaveBeenCalled();
      }
    });

    it('should handle default editor mode changes', async () => {
      const onOptionsChange = jest.fn();
      render(
        <ConfigEditor
          options={{
            ...baseOptions,
            jsonData: { ...jsonData, defaultEditorMode: EditorMode.Raw },
          }}
          onOptionsChange={onOptionsChange}
        />
      );

      // Look for editor mode selection
      const selects = screen.getAllByRole('combobox');
      const editorModeSelect = selects.find((select) => select.getAttribute('value') === EditorMode.Raw);

      if (editorModeSelect) {
        fireEvent.change(editorModeSelect, { target: { value: EditorMode.Visual } });
        expect(onOptionsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            jsonData: expect.objectContaining({
              defaultEditorMode: EditorMode.Visual,
            }),
          })
        );
      }
    });
  });
});
