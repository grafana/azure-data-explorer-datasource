import { t, Trans } from '@grafana/i18n';
import React, { useMemo } from 'react';

import { AadCurrentUserCredentials, AzureCredentials, instanceOfAzureCredential } from '@grafana/azure-sdk';
import { SelectableValue } from '@grafana/data';
import { config } from '@grafana/runtime';
import { ConfigSection } from '@grafana/plugin-ui';
import { Alert, Field, RadioButtonGroup, Select, Stack, TextLink } from '@grafana/ui';

import { selectors } from 'test/selectors';

import { AppRegistrationCredentials } from './AppRegistrationCredentials';

type FallbackCredentialAuthType = 'clientsecret' | 'msi' | 'workloadidentity';

export interface Props {
  managedIdentityEnabled: boolean;
  workloadIdentityEnabled: boolean;
  credentials: AadCurrentUserCredentials;
  azureCloudOptions?: SelectableValue[];
  onCredentialsChange: (updatedCredentials: AzureCredentials) => void;
  disabled?: boolean;
}

export const CurrentUserFallbackCredentials = (props: Props) => {
  const {
    credentials,
    azureCloudOptions,
    onCredentialsChange,
    disabled,
    managedIdentityEnabled,
    workloadIdentityEnabled,
  } = props;

  const authTypeOptions = useMemo(() => {
    const opts: Array<SelectableValue<FallbackCredentialAuthType>> = [
      {
        value: 'clientsecret',
        label: t('components.azure-credentials-form.auth-type-options.opts.label.app-registration', 'App Registration'),
      },
    ];

    if (managedIdentityEnabled) {
      opts.push({
        value: 'msi',
        label: t('components.azure-credentials-form.auth-type-options.label.managed-identity', 'Managed Identity'),
      });
    }

    if (workloadIdentityEnabled) {
      opts.push({
        value: 'workloadidentity',
        label: t('components.azure-credentials-form.auth-type-options.label.workload-identity', 'Workload Identity'),
      });
    }

    return opts;
  }, [managedIdentityEnabled, workloadIdentityEnabled]);

  const onAuthTypeChange = (selected: SelectableValue<FallbackCredentialAuthType>) => {
    const defaultAuthType: FallbackCredentialAuthType = managedIdentityEnabled
      ? 'msi'
      : workloadIdentityEnabled
        ? 'workloadidentity'
        : 'clientsecret';
    const updated: AadCurrentUserCredentials = {
      ...credentials,
      serviceCredentials: {
        authType: selected.value || defaultAuthType,
      },
    };
    onCredentialsChange(updated);
  };

  const onServiceCredentialsEnabledChange = (value: boolean) => {
    let updated: AzureCredentials = { ...credentials, serviceCredentialsEnabled: value };
    if (!value) {
      updated = { ...updated, serviceCredentials: undefined };
    }
    onCredentialsChange(updated);
  };

  const onServiceCredentialsChange = (serviceCredentials: AzureCredentials) => {
    if (!instanceOfAzureCredential('currentuser', serviceCredentials)) {
      onCredentialsChange({ ...credentials, serviceCredentials });
    }
  };

  if (!config.azure.userIdentityFallbackCredentialsEnabled) {
    return (
      <Alert
        severity="info"
        title={t(
          'components.current-user-fallback-credentials.title-fallback-credentials-disabled',
          'Fallback credentials disabled'
        )}
      >
        <Trans i18nKey="components.current-user-fallback-credentials.alert-fallback-credentials-disabled">
          Fallback credentials have been disabled. As current user authentication only supports requests with a user in
          context, features such as alerting, recorded queries, and reporting will not function as expected. See the{' '}
          <TextLink
            href="https://github.com/grafana/azure-data-explorer-datasource/blob/main/doc/current-user-auth.md"
            external
          >
            documentation
          </TextLink>{' '}
          for more details.
        </Trans>
      </Alert>
    );
  }

  return (
    <ConfigSection
      title={t(
        'components.current-user-fallback-credentials.title-fallback-service-credentials',
        'Fallback Service Credentials'
      )}
      isCollapsible={true}
    >
      <Alert
        severity="info"
        title={t('components.current-user-fallback-credentials.title-service-credentials', 'Service Credentials')}
      >
        <Stack direction={'column'}>
          <div>
            <Trans i18nKey="components.current-user-fallback-credentials.body-service-credentials">
              Current user authentication does not support Grafana features that make requests to the data source without
              a user in the context of the request. An example of this is alerting. To ensure these features continue to
              function, provide fallback credentials below.
            </Trans>
          </div>
          <div>
            <b>
              <Trans i18nKey="components.current-user-fallback-credentials.note-service-credentials">
                Note: Features like alerting will be restricted to the access level of the fallback credentials rather
                than the user.
              </Trans>
            </b>
          </div>
        </Stack>
      </Alert>
      <Field
        label={t('components.current-user-fallback-credentials.label-service-credentials', 'Service Credentials')}
        description={t(
          'components.current-user-fallback-credentials.description-service-credentials',
          'Choose if fallback service credentials are enabled or disabled for this data source'
        )}
        data-testid={selectors.components.configEditor.serviceCredentialsEnabled.button}
      >
        <RadioButtonGroup
          options={[
            { label: t('components.current-user-fallback-credentials.label-enabled', 'Enabled'), value: true },
            { label: t('components.current-user-fallback-credentials.label-disabled', 'Disabled'), value: false },
          ]}
          value={credentials.serviceCredentialsEnabled ?? false}
          size={'md'}
          onChange={(val) => onServiceCredentialsEnabledChange(val)}
        />
      </Field>
      {credentials.serviceCredentialsEnabled ? (
        <>
          {authTypeOptions.length > 0 && (
            <Field
              label={t('components.current-user-fallback-credentials.label-authentication', 'Authentication')}
              description={t(
                'components.current-user-fallback-credentials.description-authentication',
                'Choose the type of authentication to Azure services'
              )}
              data-testid={selectors.components.configEditor.serviceCredentialsAuthType.input}
              htmlFor="fallback-authentication-type"
            >
              <Select
                inputId="fallback-authentication-type"
                className="width-15"
                value={authTypeOptions.find((opt) => opt.value === credentials.serviceCredentials?.authType)}
                options={authTypeOptions}
                onChange={onAuthTypeChange}
                disabled={disabled}
              />
            </Field>
          )}
          {credentials.serviceCredentials?.authType === 'clientsecret' && (
            <AppRegistrationCredentials
              credentials={credentials.serviceCredentials}
              azureCloudOptions={azureCloudOptions}
              onCredentialsChange={onServiceCredentialsChange}
              disabled={disabled}
            />
          )}
        </>
      ) : null}
    </ConfigSection>
  );
};

export default CurrentUserFallbackCredentials;
