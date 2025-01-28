import React, { ChangeEvent, FunctionComponent, useMemo } from 'react';

import { AzureAuthType, AzureCredentials } from '@grafana/azure-sdk';
import { SelectableValue } from '@grafana/data';
import { Alert, Button, Select, Input, Field } from '@grafana/ui';

import { selectors } from 'test/selectors';
import { ConfigSection } from '@grafana/plugin-ui';

export interface Props {
  userIdentityEnabled: boolean;
  managedIdentityEnabled: boolean;
  workloadIdentityEnabled: boolean;
  oboEnabled: boolean;
  credentials: AzureCredentials;
  azureCloudOptions?: SelectableValue[];
  onCredentialsChange: (updatedCredentials: AzureCredentials) => void;
}

export const AzureCredentialsForm: FunctionComponent<Props> = (props: Props) => {
  const {
    credentials,
    azureCloudOptions,
    managedIdentityEnabled,
    userIdentityEnabled,
    workloadIdentityEnabled,
    onCredentialsChange,
  } = props;

  const authTypeOptions = useMemo<Array<SelectableValue<AzureAuthType>>>(() => {
    let opts: Array<SelectableValue<AzureAuthType>> = [
      {
        value: 'clientsecret',
        label: 'App Registration',
      },
    ];

    if (managedIdentityEnabled) {
      opts.unshift({
        value: 'msi',
        label: 'Managed Identity',
      });
    }

    if (workloadIdentityEnabled) {
      opts.unshift({
        value: 'workloadidentity',
        label: 'Workload Identity',
      });
    }

    if (userIdentityEnabled) {
      opts.unshift({
        value: 'currentuser',
        label: 'Current User',
      });
    }

    if (props.oboEnabled) {
      opts.push({
        value: 'clientsecret-obo',
        label: 'App Registration (On-Behalf-Of)',
      });
    }

    return opts;
  }, [userIdentityEnabled, managedIdentityEnabled, workloadIdentityEnabled, props.oboEnabled]);

  const onAuthTypeChange = (selected: SelectableValue<AzureAuthType>) => {
    const defaultAuthType = userIdentityEnabled
      ? 'currentuser'
      : managedIdentityEnabled
      ? 'msi'
      : workloadIdentityEnabled
      ? 'workloadidentity'
      : 'clientsecret';
    if (onCredentialsChange) {
      const updated: AzureCredentials = {
        ...credentials,
        authType: selected.value || defaultAuthType,
      };
      onCredentialsChange(updated);
    }
  };

  const onAzureCloudChange = (selected: SelectableValue<string>) => {
    if (credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo') {
      const updated: AzureCredentials = {
        ...credentials,
        azureCloud: selected.value,
      };
      onCredentialsChange(updated);
    }
  };

  const onTenantIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo') {
      const updated: AzureCredentials = {
        ...credentials,
        tenantId: event.target.value,
      };
      onCredentialsChange(updated);
    }
  };

  const onClientIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo') {
      const updated: AzureCredentials = {
        ...credentials,
        clientId: event.target.value,
      };
      onCredentialsChange(updated);
    }
  };

  const onClientSecretChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo') {
      const updated: AzureCredentials = {
        ...credentials,
        clientSecret: event.target.value,
      };
      onCredentialsChange(updated);
    }
  };

  const onClientSecretReset = () => {
    if (credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo') {
      const updated: AzureCredentials = {
        ...credentials,
        clientSecret: '',
      };
      onCredentialsChange(updated);
    }
  };

  return (
    <ConfigSection title="Authentication">
      {authTypeOptions.length > 1 && (
        <Field
          label="Authentication Method"
          description="Choose the type of authentication to Azure services"
          htmlFor="azure-auth-type"
          data-testid={selectors.components.configEditor.authType.input}
        >
          <Select
            inputId="azure-auth-type"
            className="width-15"
            value={authTypeOptions.find((opt) => opt.value === credentials.authType)}
            options={authTypeOptions}
            onChange={onAuthTypeChange}
          />
        </Field>
      )}
      {credentials.authType === 'currentuser' && (
        <>
          <Alert title="Current user authentication is experimental" severity="warning">
            Certain Grafana features (e.g. alerting) may not work as expected. For other known limitations and issues,
            bug reports, or feedback, please visit{' '}
            <a
              href="https://github.com/grafana/azure-data-explorer-datasource/blob/main/doc/current-user-auth.md"
              target="_blank"
              rel="noreferrer"
            >
              the documentation
            </a>
            .
          </Alert>
        </>
      )}
      {credentials.authType === 'clientsecret-obo' && (
        <>
          <Alert title="On-Behalf-Of feature is in beta" severity="warning">
            For known limitations and issues, bug report, or feedback, please visit{' '}
            <a
              href="https://github.com/grafana/azure-data-explorer-datasource/blob/main/doc/on-behalf-of.md"
              target="_blank"
              rel="noreferrer"
            >
              the documentation
            </a>
            .
          </Alert>
        </>
      )}
      {(credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo') && (
        <>
          {azureCloudOptions && (
            <Field
              label="Azure Cloud"
              htmlFor="azure-cloud-type"
              data-testid={selectors.components.configEditor.azureCloud.input}
            >
              <Select
                inputId="azure-cloud-type"
                className="width-15"
                aria-label="Azure Cloud"
                value={azureCloudOptions.find((opt) => opt.value === credentials.azureCloud)}
                options={azureCloudOptions}
                onChange={onAzureCloudChange}
              />
            </Field>
          )}
          <Field
            label="Directory (tenant) ID"
            htmlFor="aad-tenant-id"
            required
            invalid={!credentials.tenantId}
            error={'Tenant ID is required'}
          >
            <Input
              id="aad-tenant-id"
              className="width-30"
              aria-label="Tenant ID"
              placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              value={credentials.tenantId || ''}
              onChange={onTenantIdChange}
              data-testid={selectors.components.configEditor.tenantID.input}
            />
          </Field>
          <Field
            label="Application (client) ID"
            htmlFor="aad-client-id"
            required
            invalid={!credentials.clientId}
            error={'Client ID is required'}
          >
            <Input
              id="aad-client-id"
              className="width-30"
              aria-label="Client ID"
              placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              value={credentials.clientId || ''}
              onChange={onClientIdChange}
              data-testid={selectors.components.configEditor.clientID.input}
            />
          </Field>

          {typeof credentials.clientSecret === 'symbol' ? (
            <Field label="Client Secret" htmlFor="aad-client-secret-configured" required>
              <div className="width-30" style={{ display: 'flex', gap: '4px' }}>
                <Input
                  id="aad-client-secret-configured"
                  aria-label="Client Secret"
                  placeholder="configured"
                  disabled={true}
                />
                <Button variant="secondary" type="button" onClick={onClientSecretReset}>
                  Reset
                </Button>
              </div>
            </Field>
          ) : (
            <Field
              label="Client Secret"
              htmlFor="aad-client-secret"
              required
              invalid={!credentials.clientSecret}
              error={'Client secret is required'}
            >
              <Input
                id="aad-client-secret"
                className="width-30"
                aria-label="Client Secret"
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                value={credentials.clientSecret || ''}
                onChange={onClientSecretChange}
                data-testid={selectors.components.configEditor.clientSecret.input}
              />
            </Field>
          )}
        </>
      )}
    </ConfigSection>
  );
};

export default AzureCredentialsForm;
