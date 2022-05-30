import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
      reload: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the component', async () => {
    render(<ConfigEditor {...mockConfigEditorProps()} />);

    await waitFor(() => expect(screen.getByTestId('azure-data-explorer-config-editor')).toBeInTheDocument());
  });

  it('calls refreshSchema on render', async () => {
    render(<ConfigEditor {...mockConfigEditorProps()} />);

    await waitFor(() => expect(refreshSchemaSpy).toHaveBeenCalledTimes(1));
  });

  it('calls refreshSchema on click of "Reload schema" button', async () => {
    render(<ConfigEditor {...mockConfigEditorProps()} />);
    screen.getByText('Reload schema').click();

    await waitFor(() => expect(refreshSchemaSpy).toHaveBeenCalledTimes(2));
  });

  it('should shows the beta OBO toggle if feature gate enabled', async () => {
    const originalConfigValue = grafanaRuntime.config.featureToggles.adxOnBehalfOf;

    grafanaRuntime.config.featureToggles.adxOnBehalfOf = true;

    render(<ConfigEditor {...mockConfigEditorProps()} />);

    await waitFor(() => expect(screen.getByLabelText('Use On-Behalf-Of')).toBeInTheDocument());

    // reset config to not impact future tests
    grafanaRuntime.config.featureToggles.adxOnBehalfOf = originalConfigValue;
  });

  it('should not show the beta OBO toggle if feature gate disabled', async () => {
    const originalConfigValue = grafanaRuntime.config.featureToggles.adxOnBehalfOf;

    grafanaRuntime.config.featureToggles.adxOnBehalfOf = false;

    render(<ConfigEditor {...mockConfigEditorProps()} />);

    await waitFor(() => expect(screen.queryByLabelText('Use On-Behalf-Of')).not.toBeInTheDocument());

    // reset config to not impact future tests
    grafanaRuntime.config.featureToggles.adxOnBehalfOf = originalConfigValue;
  });

  it('should set the jsonData for onBehalfOf to false if it was true and the feature flag is disabled', async () => {
    const originalConfigValue = grafanaRuntime.config.featureToggles.adxOnBehalfOf;

    grafanaRuntime.config.featureToggles.adxOnBehalfOf = false;

    const updateJson = jest.fn();

    render(<ConfigEditor {...mockConfigEditorProps({ onOptionsChange: updateJson })} />);

    await waitFor(() => expect(screen.queryByLabelText('Use On-Behalf-Of')).not.toBeInTheDocument());

    expect(updateJson).toHaveBeenCalledTimes(1);

    // reset config to not impact future tests
    grafanaRuntime.config.featureToggles.adxOnBehalfOf = originalConfigValue;
  });
});
