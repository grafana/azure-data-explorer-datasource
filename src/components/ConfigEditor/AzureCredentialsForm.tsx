import React, { ChangeEvent, FunctionComponent, useMemo } from 'react';

import { SelectableValue } from '@grafana/data';
import { Alert, Button, Select, Input, InlineField } from '@grafana/ui';

import { AzureAuthType, AzureCredentials } from './AzureCredentials';
import { selectors } from 'test/selectors';

export interface Props {
  userIdentityEnabled: boolean;
  managedIdentityEnabled: boolean;
  oboEnabled: boolean;
  credentials: AzureCredentials;
  azureCloudOptions?: SelectableValue[];
  onCredentialsChange: (updatedCredentials: AzureCredentials) => void;
}

export const AzureCredentialsForm: FunctionComponent<Props> = (props: Props) => {
  const { credentials, azureCloudOptions, onCredentialsChange } = props;

  const authTypeOptions = useMemo<Array<SelectableValue<AzureAuthType>>>(() => {
    let opts: Array<SelectableValue<AzureAuthType>> = [
      {
        value: 'clientsecret',
        label: 'App Registration',
      },
    ];

    if (props.managedIdentityEnabled) {
      opts.unshift({
        value: 'msi',
        label: 'Managed Identity',
      });
    }

    if (props.userIdentityEnabled) {
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
  }, [props.userIdentityEnabled, props.managedIdentityEnabled, props.oboEnabled]);

  const onAuthTypeChange = (selected: SelectableValue<AzureAuthType>) => {
    if (onCredentialsChange) {
      const updated: AzureCredentials = {
        ...credentials,
        authType: selected.value || 'msi',
      };
      onCredentialsChange(updated);
    }
  };

  const onAzureCloudChange = (selected: SelectableValue<string>) => {
    if (
      onCredentialsChange &&
      (credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo')
    ) {
      const updated: AzureCredentials = {
        ...credentials,
        azureCloud: selected.value,
      };
      onCredentialsChange(updated);
    }
  };

  const onTenantIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (
      onCredentialsChange &&
      (credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo')
    ) {
      const updated: AzureCredentials = {
        ...credentials,
        tenantId: event.target.value,
      };
      onCredentialsChange(updated);
    }
  };

  const onClientIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (
      onCredentialsChange &&
      (credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo')
    ) {
      const updated: AzureCredentials = {
        ...credentials,
        clientId: event.target.value,
      };
      onCredentialsChange(updated);
    }
  };

  const onClientSecretChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (
      onCredentialsChange &&
      (credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo')
    ) {
      const updated: AzureCredentials = {
        ...credentials,
        clientSecret: event.target.value,
      };
      onCredentialsChange(updated);
    }
  };

  const onClientSecretReset = () => {
    if (
      onCredentialsChange &&
      (credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo')
    ) {
      const updated: AzureCredentials = {
        ...credentials,
        clientSecret: '',
      };
      onCredentialsChange(updated);
    }
  };

  return (
    <div className="gf-form-group">
      {authTypeOptions.length > 1 && (
        <InlineField
          label="Authentication"
          labelWidth={18}
          tooltip="Choose the type of authentication to Azure services"
          htmlFor="azure-auth-type"
        >
          <Select
            inputId="azure-auth-type"
            className="width-15"
            value={authTypeOptions.find((opt) => opt.value === credentials.authType)}
            options={authTypeOptions}
            onChange={onAuthTypeChange}
          />
        </InlineField>
      )}
      {credentials.authType === 'currentuser' && (
        <>
          <Alert title="Current user authentication is experimental" severity="warning">
            Certain Grafana features (e.g. alerting) may not work as expected. For other known limitations and issues, bug reports, or feedback, please visit{' '}
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
            <InlineField
              label="Azure Cloud"
              labelWidth={18}
              tooltip="Choose an Azure Cloud"
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
            </InlineField>
          )}
          <InlineField label="Directory (tenant) ID" labelWidth={18} htmlFor="aad-tenant-id">
            <div className="width-15">
              <Input
                id="aad-tenant-id"
                className="width-30"
                aria-label="Tenant ID"
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                value={credentials.tenantId || ''}
                onChange={onTenantIdChange}
                data-testid={selectors.components.configEditor.tenantID.input}
              />
            </div>
          </InlineField>
          <InlineField label="Application (client) ID" labelWidth={18} htmlFor="aad-client-id">
            <div className="width-15">
              <Input
                id="aad-client-id"
                className="width-30"
                aria-label="Client ID"
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                value={credentials.clientId || ''}
                onChange={onClientIdChange}
                data-testid={selectors.components.configEditor.clientID.input}
              />
            </div>
          </InlineField>

          {typeof credentials.clientSecret === 'symbol' ? (
            <InlineField label="Client Secret" labelWidth={18} htmlFor="aad-client-secret-configured">
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
            </InlineField>
          ) : (
            <InlineField label="Client Secret" labelWidth={18} htmlFor="aad-client-secret">
              <Input
                id="aad-client-secret"
                className="width-30"
                aria-label="Client Secret"
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                value={credentials.clientSecret || ''}
                onChange={onClientSecretChange}
                data-testid={selectors.components.configEditor.clientSecret.input}
              />
            </InlineField>
          )}
        </>
      )}
    </div>
  );
};

export default AzureCredentialsForm;
