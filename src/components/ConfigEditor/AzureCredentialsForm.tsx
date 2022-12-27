import React, { ChangeEvent, FunctionComponent, useMemo } from 'react';

import { SelectableValue } from '@grafana/data';
import { InlineFormLabel, Button, Select, Input } from '@grafana/ui';

import { AzureAuthType, AzureCredentials } from './AzureCredentials';

export interface Props {
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

    if (props.oboEnabled) {
      opts.push({
        value: 'clientsecret-obo',
        label: 'App Registration (On-Behalf-Of)',
      });
    }

    return opts;
  }, [props.managedIdentityEnabled, props.oboEnabled]);

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
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel className="width-12" tooltip="Choose the type of authentication to Azure services">
              Authentication
            </InlineFormLabel>
            <Select
              className="width-15"
              value={authTypeOptions.find((opt) => opt.value === credentials.authType)}
              options={authTypeOptions}
              onChange={onAuthTypeChange}
            />
          </div>
        </div>
      )}
      {(credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo') && (
        <>
          {azureCloudOptions && (
            <div className="gf-form-inline">
              <div className="gf-form">
                <InlineFormLabel className="width-12" tooltip="Choose an Azure Cloud">
                  Azure Cloud
                </InlineFormLabel>
                <Select
                  className="width-15"
                  value={azureCloudOptions.find((opt) => opt.value === credentials.azureCloud)}
                  options={azureCloudOptions}
                  onChange={onAzureCloudChange}
                />
              </div>
            </div>
          )}
          <div className="gf-form-inline">
            <div className="gf-form">
              <InlineFormLabel className="width-12">Directory (tenant) ID</InlineFormLabel>
              <div className="width-15">
                <Input
                  className="width-30"
                  placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  value={credentials.tenantId || ''}
                  onChange={onTenantIdChange}
                />
              </div>
            </div>
          </div>
          <div className="gf-form-inline">
            <div className="gf-form">
              <InlineFormLabel className="width-12">Application (client) ID</InlineFormLabel>
              <div className="width-15">
                <Input
                  className="width-30"
                  placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  value={credentials.clientId || ''}
                  onChange={onClientIdChange}
                />
              </div>
            </div>
          </div>
          {typeof credentials.clientSecret === 'symbol' ? (
            <div className="gf-form-inline">
              <div className="gf-form">
                <InlineFormLabel className="width-12">Client Secret</InlineFormLabel>
                <Input className="width-25" placeholder="configured" disabled={true} />
              </div>
              <div className="gf-form">
                <div className="max-width-30 gf-form-inline">
                  <Button variant="secondary" type="button" onClick={onClientSecretReset}>
                    reset
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="gf-form-inline">
              <div className="gf-form">
                <InlineFormLabel className="width-12">Client Secret</InlineFormLabel>
                <div className="width-15">
                  <Input
                    className="width-30"
                    placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                    value={credentials.clientSecret || ''}
                    onChange={onClientSecretChange}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AzureCredentialsForm;
