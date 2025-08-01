import { t, Trans } from '@grafana/i18n';
import { getCredentials } from './AzureCredentialsConfig';

import { isCredentialsComplete } from '@grafana/azure-sdk';
import { ConfigSection } from '@grafana/plugin-ui';
import React, { useMemo } from 'react';
import { AdxDataSourceSettings } from 'types';
import { TextLink } from '@grafana/ui';

interface ConfigHelpProps {
  options: AdxDataSourceSettings;
}

const ConfigHelp: React.FC<ConfigHelpProps> = ({ options }) => {
  const isHelpOpen = useMemo(() => !isCredentialsComplete(getCredentials(options)), [options]);

  return (
    <ConfigSection
      title={t('components.config-help.title-configuration-help', 'Configuration Help')}
      isCollapsible
      isInitiallyOpen={isHelpOpen}
    >
      <div className="grafana-info-box">
        <h5>
          <Trans i18nKey="components.config-help.configuring-azure-explorer-database">
            Configuring Azure and your Azure Data Explorer Database
          </Trans>
        </h5>
        <h5>
          <Trans i18nKey="components.config-help.create-an-aad-application">1. Create an AAD application</Trans>
        </h5>
        <p>
          <Trans i18nKey="components.config-help.create-an-aad-application-description">
            Details on how to do create one via the Azure portal or with the Azure CLI can be found{' '}
            <TextLink
              href="https://github.com/grafana/azure-data-explorer-datasource#configuring-the-datasource-in-grafana"
              external
            >
              here.
            </TextLink>
          </Trans>
        </p>

        <h5>
          <Trans i18nKey="components.config-help.connect-application-database">
            2. Connect the AAD Application to a database user
          </Trans>
        </h5>
        <p>
          <Trans
            i18nKey="components.config-help.connect-application-database-description"
            values={{ dotCommand: 'add' }}
          >
            Navigate to the Azure Data Explorer Web UI via the Azure Portal. The AAD application that you created in
            step 1 needs to be given viewer access to your Azure Data Explorer database. This is done using the dot
            command <i>{'{{dotCommand}}'}</i>:
          </Trans>
        </p>

        <pre>
          <Trans i18nKey="components.config-help.dot-command-example" values={{ dotCommand: '.add', key: 'aadapp' }}>
            {'{{dotCommand}}'} database your_db_name viewers (&lsquo;{'{{key}}'}=your_client_id;your_tenant_id&rsquo;)
          </Trans>
        </pre>

        <h5>
          <Trans i18nKey="components.config-help.configure-the-connection-in-grafana">
            3. Configure the connection in Grafana
          </Trans>
        </h5>
        <p>
          <Trans i18nKey="components.config-help.save-and-test">
            Use the details from the AAD Service Principle from Step 1 to fill in the field below. Then click the Save &
            Test button.
          </Trans>
        </p>

        <p>
          <Trans i18nKey="components.config-help.detailed-instructions">
            Detailed instructions on all three steps can found in{' '}
            <TextLink
              href="https://github.com/grafana/azure-data-explorer-datasource#configuring-the-datasource-in-grafana"
              external
            >
              in the documentation.
            </TextLink>
          </Trans>
        </p>
      </div>
    </ConfigSection>
  );
};

export default ConfigHelp;
