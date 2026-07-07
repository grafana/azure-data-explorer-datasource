import { t, Trans } from '@grafana/i18n';
import React from 'react';

import { AadCurrentUserCredentials } from '@grafana/azure-sdk';
import { Alert, Field, Switch, TextLink } from '@grafana/ui';

import { selectors } from 'test/selectors';

export interface Props {
  credentials: AadCurrentUserCredentials;
  onCredentialsChange: (updatedCredentials: AadCurrentUserCredentials) => void;
}

export const CurrentUserFallbackCredentials = ({ credentials, onCredentialsChange }: Props) => {
  const onServiceCredentialsEnabledChange = (enabled: boolean) => {
    onCredentialsChange({ ...credentials, serviceCredentialsEnabled: enabled });
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
    </>
  );
};

export default CurrentUserFallbackCredentials;
