import { t } from '@grafana/i18n';
import React, { ChangeEvent } from 'react';

import { AzureCredentials } from '@grafana/azure-sdk';
import { Field, Input } from '@grafana/ui';

import { selectors } from 'test/selectors';

import { AzureWorkloadIdentityCredentialsWithIds } from './AzureCredentialsConfig';

export interface Props {
  credentials: AzureWorkloadIdentityCredentialsWithIds;
  onCredentialsChange: (updatedCredentials: AzureCredentials) => void;
  disabled?: boolean;
}

export const WorkloadIdentityCredentials = ({ credentials, onCredentialsChange, disabled }: Props) => {
  const onTenantIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCredentialsChange({ ...credentials, tenantId: event.target.value } as AzureCredentials);
  };

  const onClientIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCredentialsChange({ ...credentials, clientId: event.target.value } as AzureCredentials);
  };

  return (
    <>
      <Field
        label={t('components.azure-credentials-form.label-directory-tenant-id', 'Directory (tenant) ID')}
        htmlFor="workload-identity-tenant-id"
      >
        <Input
          id="workload-identity-tenant-id"
          className="width-30"
          aria-label={t('components.azure-credentials-form.aad-tenant-id-aria-label-tenant-id', 'Tenant ID')}
          // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
          placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          value={credentials.tenantId || ''}
          onChange={onTenantIdChange}
          disabled={disabled}
          data-testid={selectors.components.configEditor.tenantID.input}
        />
      </Field>
      <Field
        label={t('components.azure-credentials-form.label-application-client-id', 'Application (client) ID')}
        htmlFor="workload-identity-client-id"
      >
        <Input
          id="workload-identity-client-id"
          className="width-30"
          aria-label={t('components.azure-credentials-form.aad-client-id-aria-label-client-id', 'Client ID')}
          // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
          placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          value={credentials.clientId || ''}
          onChange={onClientIdChange}
          disabled={disabled}
          data-testid={selectors.components.configEditor.clientID.input}
        />
      </Field>
    </>
  );
};
