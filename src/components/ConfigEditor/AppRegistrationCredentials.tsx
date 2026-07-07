import { t, Trans } from '@grafana/i18n';
import React, { ChangeEvent } from 'react';

import { AzureClientSecretCredentials, AzureClientSecretOboCredentials } from '@grafana/azure-sdk';
import { SelectableValue } from '@grafana/data';
import { Button, Select, Input, Field } from '@grafana/ui';

import { selectors } from 'test/selectors';

type ClientSecretCredentials = AzureClientSecretCredentials | AzureClientSecretOboCredentials;

export interface Props {
  credentials: ClientSecretCredentials;
  azureCloudOptions?: SelectableValue[];
  onCredentialsChange: (updatedCredentials: ClientSecretCredentials) => void;
}

export const AppRegistrationCredentials = ({ credentials, azureCloudOptions, onCredentialsChange }: Props) => {
  const onAzureCloudChange = (selected: SelectableValue<string>) => {
    onCredentialsChange({ ...credentials, azureCloud: selected.value });
  };

  const onTenantIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCredentialsChange({ ...credentials, tenantId: event.target.value });
  };

  const onClientIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCredentialsChange({ ...credentials, clientId: event.target.value });
  };

  const onClientSecretChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCredentialsChange({ ...credentials, clientSecret: event.target.value });
  };

  const onClientSecretReset = () => {
    onCredentialsChange({ ...credentials, clientSecret: '' });
  };

  return (
    <>
      {azureCloudOptions && (
        <Field
          label={t('components.azure-credentials-form.label-azure-cloud', 'Azure Cloud')}
          htmlFor="azure-cloud-type"
          data-testid={selectors.components.configEditor.azureCloud.input}
        >
          <Select
            inputId="azure-cloud-type"
            className="width-15"
            aria-label={t('components.azure-credentials-form.aria-label-azure-cloud', 'Azure Cloud')}
            value={azureCloudOptions.find((opt) => opt.value === credentials.azureCloud)}
            options={azureCloudOptions}
            onChange={onAzureCloudChange}
          />
        </Field>
      )}
      <Field
        label={t('components.azure-credentials-form.label-directory-tenant-id', 'Directory (tenant) ID')}
        htmlFor="aad-tenant-id"
        required
        invalid={!credentials.tenantId}
        error={t('components.azure-credentials-form.error-tenant-id-required', 'Tenant ID is required')}
      >
        <Input
          id="aad-tenant-id"
          className="width-30"
          aria-label={t('components.azure-credentials-form.aad-tenant-id-aria-label-tenant-id', 'Tenant ID')}
          // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
          placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          value={credentials.tenantId || ''}
          onChange={onTenantIdChange}
          data-testid={selectors.components.configEditor.tenantID.input}
        />
      </Field>
      <Field
        label={t('components.azure-credentials-form.label-application-client-id', 'Application (client) ID')}
        htmlFor="aad-client-id"
        required
        invalid={!credentials.clientId}
        error={t('components.azure-credentials-form.error-client-id-required', 'Client ID is required')}
      >
        <Input
          id="aad-client-id"
          className="width-30"
          aria-label={t('components.azure-credentials-form.aad-client-id-aria-label-client-id', 'Client ID')}
          // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
          placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          value={credentials.clientId || ''}
          onChange={onClientIdChange}
          data-testid={selectors.components.configEditor.clientID.input}
        />
      </Field>

      {typeof credentials.clientSecret === 'symbol' ? (
        <Field
          label={t('components.azure-credentials-form.label-client-secret', 'Client Secret')}
          htmlFor="aad-client-secret-configured"
          required
        >
          <div className="width-30" style={{ display: 'flex', gap: '4px' }}>
            <Input
              id="aad-client-secret-configured"
              aria-label={t(
                'components.azure-credentials-form.aad-client-secret-configured-aria-label-client-secret',
                'Client Secret'
              )}
              placeholder={t(
                'components.azure-credentials-form.aad-client-secret-configured-placeholder-configured',
                'configured'
              )}
              disabled={true}
            />
            <Button variant="secondary" type="button" onClick={onClientSecretReset}>
              <Trans i18nKey="components.azure-credentials-form.reset">Reset</Trans>
            </Button>
          </div>
        </Field>
      ) : (
        <Field
          label={t('components.azure-credentials-form.label-client-secret', 'Client Secret')}
          htmlFor="aad-client-secret"
          required
          invalid={!credentials.clientSecret}
          error={t('components.azure-credentials-form.error-client-secret-required', 'Client secret is required')}
        >
          <Input
            id="aad-client-secret"
            className="width-30"
            aria-label={t('components.azure-credentials-form.aad-client-secret-aria-label-client-secret', 'Client Secret')}
            // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
            placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
            value={credentials.clientSecret || ''}
            onChange={onClientSecretChange}
            data-testid={selectors.components.configEditor.clientSecret.input}
          />
        </Field>
      )}
    </>
  );
};

export default AppRegistrationCredentials;
