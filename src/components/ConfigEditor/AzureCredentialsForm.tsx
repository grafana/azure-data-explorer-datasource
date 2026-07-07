import { t, Trans } from '@grafana/i18n';
import React, { FunctionComponent, useMemo } from 'react';

import { AzureAuthType, AzureCredentials } from '@grafana/azure-sdk';
import { SelectableValue } from '@grafana/data';
import { Alert, Select, Field, TextLink } from '@grafana/ui';

import { ConfigSection } from '@grafana/plugin-ui';
import { selectors } from 'test/selectors';

import { AppRegistrationCredentials } from './AppRegistrationCredentials';
import { CurrentUserFallbackCredentials } from './CurrentUserFallbackCredentials';

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
        <CurrentUserFallbackCredentials
          credentials={credentials}
          managedIdentityEnabled={managedIdentityEnabled}
          workloadIdentityEnabled={workloadIdentityEnabled}
          azureCloudOptions={azureCloudOptions}
          onCredentialsChange={onCredentialsChange}
        />
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
        <AppRegistrationCredentials
          credentials={credentials}
          azureCloudOptions={azureCloudOptions}
          onCredentialsChange={onCredentialsChange}
        />
      )}
    </ConfigSection>
  );
};

export default AzureCredentialsForm;
