import { getCredentials } from './AzureCredentialsConfig';

import { isCredentialsComplete } from '@grafana/azure-sdk';
import { ConfigSection } from '@grafana/plugin-ui';
import React, { useMemo } from 'react';
import { AdxDataSourceSettings } from 'types';

interface ConfigHelpProps {
  options: AdxDataSourceSettings;
}

const ConfigHelp: React.FC<ConfigHelpProps> = ({ options }) => {
  const isHelpOpen = useMemo(() => !isCredentialsComplete(getCredentials(options)), [options]);

  return (
    <ConfigSection title="Configuration Help" isCollapsible isInitiallyOpen={isHelpOpen}>
      <div className="grafana-info-box">
        <h5>Configuring Azure and your Azure Data Explorer Database</h5>
        <h5>1. Create an AAD application</h5>
        <p>
          Details on how to do create one via the Azure portal or with the Azure CLI can be found{' '}
          <a
            className="external-link"
            target="_blank"
            rel="noreferrer"
            href="https://github.com/grafana/azure-data-explorer-datasource#configuring-the-datasource-in-grafana"
          >
            here.
          </a>
        </p>

        <h5>2. Connect the AAD Application to a database user</h5>
        <p>
          Navigate to the Azure Data Explorer Web UI via the Azure Portal. The AAD application that you created in step
          1 needs to be given viewer access to your Azure Data Explorer database. This is done using the dot command{' '}
          <i>add</i>:
        </p>

        <pre>.add database your_db_name viewers (&lsquo;aadapp=your_client_id;your_tenant_id&rsquo;)</pre>

        <h5>3. Configure the connection in Grafana</h5>
        <p>
          Use the details from the AAD Service Principle from Step 1 to fill in the field below. Then click the Save &
          Test button.
        </p>

        <p>
          Detailed instructions on all three steps can found in{' '}
          <a
            className="external-link"
            target="_blank"
            rel="noreferrer"
            href="https://github.com/grafana/azure-data-explorer-datasource#configuring-the-datasource-in-grafana"
          >
            in the documentation.
          </a>
        </p>
      </div>
    </ConfigSection>
  );
};

export default ConfigHelp;
