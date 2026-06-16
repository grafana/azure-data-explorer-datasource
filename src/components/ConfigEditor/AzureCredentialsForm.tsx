import { t, Trans } from '@grafana/i18n';
import React, { ChangeEvent, FunctionComponent, useMemo } from 'react';

import { AzureAuthType, AzureCredentials } from '@grafana/azure-sdk';
import { SelectableValue } from '@grafana/data';
import { Alert, Button, Select, Input, Field, TextLink } from '@grafana/ui';

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
        label: t('components.azure-credentials-form.auth-type-options.opts.label.app-registration', 'App Registration'),
      },
    ];

    if (managedIdentityEnabled) {
      opts.unshift({
        value: 'msi',
        label: t('components.azure-credentials-form.auth-type-options.label.managed-identity', 'Managed Identity'),
      });
    }

    if (workloadIdentityEnabled) {
      opts.unshift({
        value: 'workloadidentity',
        label: t('components.azure-credentials-form.auth-type-options.label.workload-identity', 'Workload Identity'),
      });
    }

    if (userIdentityEnabled) {
      opts.unshift({
        value: 'currentuser',
        label: t('components.azure-credentials-form.auth-type-options.label.current-user', 'Current User'),
      });
    }

    if (props.oboEnabled) {
      opts.push({
        value: 'clientsecret-obo',
        label: t(
          'components.azure-credentials-form.auth-type-options.label.app-registration-on-behalf-of',
          'App Registration (On-Behalf-Of)'
        ),
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
    <ConfigSection title={t('components.azure-credentials-form.title-authentication', 'Authentication')}>
      {authTypeOptions.length > 1 && (
        <Field
          label={t('components.azure-credentials-form.label-authentication-method', 'Authentication Method')}
          description={t(
            'components.azure-credentials-form.description-choose-authentication-azure-services',
            'Choose the type of authentication to Azure services'
          )}
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
          <Alert
            title={t(
              'components.azure-credentials-form.title-current-user-authentication-is-experimental',
              'Current user authentication is experimental'
            )}
            severity="warning"
          >
            <Trans i18nKey="components.azure-credentials-form.description-current-user-authentication-is-experimental">
              Certain Grafana features (e.g. alerting) may not work as expected. For other known limitations and issues,
              bug reports, or feedback, please visit{' '}
              <TextLink
                href="https://github.com/grafana/azure-data-explorer-datasource/blob/main/doc/current-user-auth.md"
                external
              >
                the documentation
              </TextLink>
              .
            </Trans>
          </Alert>
        </>
      )}
      {credentials.authType === 'clientsecret-obo' && (
        <>
          <Alert
            title={t(
              'components.azure-credentials-form.title-on-behalf-of-feature-is-in-beta',
              'On-Behalf-Of feature is in beta'
            )}
            severity="warning"
          >
            <Trans i18nKey="components.azure-credentials-form.description-on-behalf-of-feature-is-in-beta">
              For known limitations and issues, bug report, or feedback, please visit{' '}
              <TextLink
                href="https://github.com/grafana/azure-data-explorer-datasource/blob/main/doc/on-behalf-of.md"
                external
              >
                the documentation
              </TextLink>
              .
            </Trans>
          </Alert>
        </>
      )}
      {(credentials.authType === 'clientsecret' || credentials.authType === 'clientsecret-obo') && (
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
                aria-label={t(
                  'components.azure-credentials-form.aad-client-secret-aria-label-client-secret',
                  'Client Secret'
                )}
                // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
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
