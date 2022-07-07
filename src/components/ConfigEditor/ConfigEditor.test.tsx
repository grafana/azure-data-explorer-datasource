import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ConfigEditor from './index';
import * as grafanaRuntime from '@grafana/runtime';
import { Chance } from 'chance';
import { mockConfigEditorProps } from 'components/__fixtures__/ConfigEditor.fixtures';

const originalConfigValue = grafanaRuntime.config.featureToggles.adxOnBehalfOf;

describe('ConfigEditor', () => {
  beforeEach(() => {
    // reset config
    grafanaRuntime.config.featureToggles.adxOnBehalfOf = originalConfigValue;

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

  it('should show the beta OBO toggle if feature gate enabled', async () => {
    grafanaRuntime.config.featureToggles.adxOnBehalfOf = true;

    render(<ConfigEditor {...mockConfigEditorProps()} />);

    await waitFor(() => expect(screen.getByLabelText('Use On-Behalf-Of')).toBeInTheDocument());
  });

  it('should not show the beta OBO toggle if feature gate disabled', async () => {
    grafanaRuntime.config.featureToggles.adxOnBehalfOf = false;

    render(<ConfigEditor {...mockConfigEditorProps()} />);

    await waitFor(() => expect(screen.queryByLabelText('Use On-Behalf-Of')).not.toBeInTheDocument());
  });

  it('should set the jsonData for onBehalfOf to false if it was true and the feature flag is disabled', async () => {
    grafanaRuntime.config.featureToggles.adxOnBehalfOf = false;

    const updateJson = jest.fn();

    render(<ConfigEditor {...mockConfigEditorProps({ onOptionsChange: updateJson })} />);

    await waitFor(() => expect(screen.queryByLabelText('Use On-Behalf-Of')).not.toBeInTheDocument());

    expect(updateJson).toHaveBeenCalledTimes(1);
  });
});
