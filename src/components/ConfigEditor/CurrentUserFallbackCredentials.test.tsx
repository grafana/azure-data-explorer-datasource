import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';

import { AadCurrentUserCredentials } from '@grafana/azure-sdk';
import { config } from '@grafana/runtime';

import { components } from 'test/selectors';

import { CurrentUserFallbackCredentials } from './CurrentUserFallbackCredentials';

jest.mock('@grafana/runtime', () => {
  const original = jest.requireActual('@grafana/runtime');
  return {
    ...original,
    config: {
      ...original.config,
      azure: {
        ...original.config.azure,
        userIdentityFallbackCredentialsEnabled: true,
      },
    },
  };
});

interface SetupOptions {
  credentials?: Partial<AadCurrentUserCredentials>;
  managedIdentityEnabled?: boolean;
  workloadIdentityEnabled?: boolean;
}

const setup = (options: SetupOptions = {}) => {
  const onCredentialsChange = jest.fn();
  const credentials: AadCurrentUserCredentials = { authType: 'currentuser', ...options.credentials };
  render(
    <CurrentUserFallbackCredentials
      managedIdentityEnabled={options.managedIdentityEnabled ?? false}
      workloadIdentityEnabled={options.workloadIdentityEnabled ?? false}
      credentials={credentials}
      onCredentialsChange={onCredentialsChange}
    />
  );
  return { onCredentialsChange };
};

describe('CurrentUserFallbackCredentials', () => {
  beforeEach(() => {
    config.azure.userIdentityFallbackCredentialsEnabled = true;
  });

  it('shows a disabled notice and no controls when fallback is disabled at the instance level', () => {
    config.azure.userIdentityFallbackCredentialsEnabled = false;
    setup();

    expect(screen.getByText(/fallback credentials have been disabled/i)).toBeInTheDocument();
    expect(screen.queryByTestId(components.configEditor.serviceCredentialsEnabled.button)).not.toBeInTheDocument();
  });

  it('renders the enabled/disabled control when fallback is enabled at the instance level', () => {
    setup();

    expect(screen.getByTestId(components.configEditor.serviceCredentialsEnabled.button)).toBeInTheDocument();
    expect(screen.queryByTestId(components.configEditor.serviceCredentialsAuthType.input)).not.toBeInTheDocument();
  });

  it('renders the auth-type selector and App Registration fields when service credentials are enabled', () => {
    setup({ credentials: { serviceCredentialsEnabled: true, serviceCredentials: { authType: 'clientsecret' } } });

    expect(screen.getByTestId(components.configEditor.serviceCredentialsAuthType.input)).toBeInTheDocument();
    expect(screen.getByTestId(components.configEditor.tenantID.input)).toBeInTheDocument();
    expect(screen.getByTestId(components.configEditor.clientID.input)).toBeInTheDocument();
  });

  it('enables service credentials when the enabled option is selected', () => {
    const { onCredentialsChange } = setup({ credentials: { serviceCredentialsEnabled: false } });

    fireEvent.click(screen.getAllByRole('radio')[0]);
    expect(onCredentialsChange).toHaveBeenCalledWith(
      expect.objectContaining({ authType: 'currentuser', serviceCredentialsEnabled: true })
    );
  });
});
