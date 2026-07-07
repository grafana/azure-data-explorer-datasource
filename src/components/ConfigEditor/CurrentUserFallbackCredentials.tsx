import { t, Trans } from '@grafana/i18n';
import React from 'react';

import { AadCurrentUserCredentials, AzureAuthType, getDefaultAzureCloud } from '@grafana/azure-sdk';
import { SelectableValue } from '@grafana/data';
import { Alert, Field, Select, Switch, TextLink } from '@grafana/ui';

import { selectors } from 'test/selectors';

import { AppRegistrationCredentials } from './AppRegistrationCredentials';

// Auth types valid as fallback service credentials (excludes currentuser and OBO).
type ServiceCredentials = NonNullable<AadCurrentUserCredentials['serviceCredentials']>;

export interface Props {
  credentials: AadCurrentUserCredentials;
  managedIdentityEnabled: boolean;
  workloadIdentityEnabled: boolean;
  azureCloudOptions?: SelectableValue[];
  onCredentialsChange: (updatedCredentials: AadCurrentUserCredentials) => void;
}

export const CurrentUserFallbackCredentials = ({
  credentials,
  managedIdentityEnabled,
  workloadIdentityEnabled,
  azureCloudOptions,
  onCredentialsChange,
}: Props) => {
  const defaultServiceCredentials = (): ServiceCredentials => {
    if (managedIdentityEnabled) {
      return { authType: 'msi' };
    }
    if (workloadIdentityEnabled) {
      return { authType: 'workloadidentity' };
    }
    return { authType: 'clientsecret', azureCloud: getDefaultAzureCloud() };
  };

  const serviceCredentials = credentials.serviceCredentials ?? defaultServiceCredentials();

  const authTypeOptions: Array<SelectableValue<AzureAuthType>> = [
    {
      value: 'clientsecret',
      label: t('components.azure-credentials-form.auth-type-options.opts.label.app-registration', 'App Registration'),
    },
  ];
  if (managedIdentityEnabled) {
    authTypeOptions.unshift({
      value: 'msi',
      label: t('components.azure-credentials-form.auth-type-options.label.managed-identity', 'Managed Identity'),
    });
  }
  if (workloadIdentityEnabled) {
    authTypeOptions.unshift({
      value: 'workloadidentity',
      label: t('components.azure-credentials-form.auth-type-options.label.workload-identity', 'Workload Identity'),
    });
  }

  const onServiceCredentialsEnabledChange = (enabled: boolean) => {
    onCredentialsChange({
      ...credentials,
      serviceCredentialsEnabled: enabled,
      serviceCredentials: enabled ? serviceCredentials : undefined,
    });
  };

  const onServiceCredentialsChange = (updatedCredentials: ServiceCredentials) => {
    onCredentialsChange({ ...credentials, serviceCredentials: updatedCredentials });
  };

  const onAuthTypeChange = (selected: SelectableValue<AzureAuthType>) => {
    switch (selected.value) {
      case 'msi':
        onServiceCredentialsChange({ authType: 'msi' });
        break;
      case 'workloadidentity':
        onServiceCredentialsChange({ authType: 'workloadidentity' });
        break;
      case 'clientsecret':
      default:
        onServiceCredentialsChange({ authType: 'clientsecret', azureCloud: getDefaultAzureCloud() });
        break;
    }
  };

  return (
    <>
      <Alert
        title={t('components.current-user-fallback-credentials.title-current-user', 'Current user authentication')}
        severity="info"
      >
        <Trans i18nKey="components.current-user-fallback-credentials.description-current-user">
          Queries run using the identity of the signed-in Grafana user. Requests made without a user in context (such as
          alerting, recorded queries, and reporting) require fallback service credentials to be configured. For more
          information, see{' '}
          <TextLink
            href="https://github.com/grafana/azure-data-explorer-datasource/blob/main/doc/current-user-auth.md"
            external
          >
            the documentation
          </TextLink>
          .
        </Trans>
      </Alert>
      <Field
        label={t(
          'components.current-user-fallback-credentials.label-enable-fallback',
          'Enable fallback service credentials'
        )}
        description={t(
          'components.current-user-fallback-credentials.description-enable-fallback',
          'Configure service credentials to use for requests that have no user in context, e.g. alerting.'
        )}
        htmlFor="fallback-credentials-enabled"
        data-testid={selectors.components.configEditor.serviceCredentialsEnabled.switch}
      >
        <Switch
          id="fallback-credentials-enabled"
          value={credentials.serviceCredentialsEnabled ?? false}
          onChange={(e) => onServiceCredentialsEnabledChange(e.currentTarget.checked)}
        />
      </Field>
      {credentials.serviceCredentialsEnabled && (
        <>
          {authTypeOptions.length > 1 && (
            <Field
              label={t(
                'components.current-user-fallback-credentials.label-fallback-auth-type',
                'Fallback authentication method'
              )}
              htmlFor="fallback-auth-type"
              data-testid={selectors.components.configEditor.serviceCredentialsAuthType.input}
            >
              <Select
                inputId="fallback-auth-type"
                className="width-15"
                value={authTypeOptions.find((opt) => opt.value === serviceCredentials.authType)}
                options={authTypeOptions}
                onChange={onAuthTypeChange}
              />
            </Field>
          )}
          {serviceCredentials.authType === 'clientsecret' && (
            <AppRegistrationCredentials
              credentials={serviceCredentials}
              azureCloudOptions={azureCloudOptions}
              onCredentialsChange={(updated) => onServiceCredentialsChange(updated as ServiceCredentials)}
            />
          )}
        </>
      )}
    </>
  );
};

export default CurrentUserFallbackCredentials;
