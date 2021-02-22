import { FieldSet, Input, Button, InlineField, Switch, Select, LegacyForms } from '@grafana/ui';
import React from 'react';

const { SecretFormField } = LegacyForms;

interface ConfigEditorProps {}

const ConfigEditor: React.FC<ConfigEditorProps> = () => {
  const clientSecretTooltip = (
    <>
      To create a new key, log in to Azure Portal, navigate to Azure Active Directory {'🡒'} App Registrations
      {' 🡒 '} Choose your app {'🡒'} Keys.
      <br />
      <br />
      <a
        target="_blank"
        href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal"
      >
        Click here for detailed instructions on setting up an Azure Active Directory (AD) application.
      </a>
    </>
  );

  return (
    <>
      <div className="gf-form-group">
        <div className="grafana-info-box">
          <h5>Configuring Azure and your Azure Data Explorer Database</h5>
          <h5>1. Create an AAD application</h5>
          <p>
            Details on how to do create one via the Azure portal or with the Azure CLI can be found{' '}
            <a
              className="external-link"
              target="_blank"
              href="https://github.com/grafana/azure-data-explorer-datasource#configuring-the-datasource-in-grafana"
            >
              here.
            </a>
          </p>

          <h5>2. Connect the AAD Application to a database user</h5>
          <p>
            Navigate to the Azure Data Explorer Web UI via the Azure Portal. The AAD application that you created in
            step 1 needs to be given viewer access to your Azure Data Explorer database. This is done using the dot
            command <i>add</i>:<pre>.add database your_db_name viewers ('aadapp=your_client_id;your_tenant_id')</pre>
          </p>

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
              href="https://github.com/grafana/azure-data-explorer-datasource#configuring-the-datasource-in-grafana"
            >
              in the documentation.
            </a>
          </p>
        </div>
      </div>

      <FieldSet label="Connection Details">
        <InlineField
          label="Cluster URL"
          labelWidth={26}
          tooltip="The cluster url for your Azure Data Explorer database."
        >
          <Input id="adx-cluster-url" placeholder="https://yourcluster.kusto.windows.net" width={60} />
        </InlineField>

        <InlineField
          label="Tenant ID"
          labelWidth={26}
          tooltip={
            <>
              In the Azure Portal, navigate to Azure Active Directory {'🡒'} Properties {'🡒'} Directory ID.
              <br />
              <br />
              <a
                target="_blank"
                href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal"
              >
                Click here for detailed instructions on setting up an Azure Active Directory (AD) application.
              </a>
            </>
          }
        >
          <Input id="adx-tenant-id" width={60} />
        </InlineField>

        <InlineField
          label="Client ID"
          labelWidth={26}
          tooltip={
            <>
              In the Azure Portal, navigate to Azure Active Directory {'🡒'} App Registrations {'🡒'} Choose your app{' '}
              {'🡒'}
              Application ID.
              <br />
              <br />
              <a
                target="_blank"
                href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal"
              >
                Click here for detailed instructions on setting up an Azure Active Directory (AD) application.
              </a>
            </>
          }
        >
          <Input id="adx-client-id" width={60} />
        </InlineField>

        <SecretFormField
          label="Client secret"
          labelWidth={13}
          inputWidth={16}
          onReset={() => {}}
          isConfigured={true}
          // tooltip is typed too strictly (it can safely accept ReactNode), and has been fixed in https://github.com/grafana/grafana/pull/31310
          // but we just cast it to string to satisfy the types until we can upgrade
          tooltip={(clientSecretTooltip as unknown) as string}
        />
      </FieldSet>

      <FieldSet label="Query Optimizations">
        <InlineField label="Query timeout" labelWidth={26} tooltip="This value controls the client query timeout.">
          <Input id="adx-query-timeout" placeholder="30s" width={18} />
        </InlineField>

        <InlineField
          label="Use dynamic caching"
          labelWidth={26}
          tooltip="By enabling this feature Grafana will dynamically apply cache settings on a per query basis and the default cache max age will be ignored.<br /><br />For time series queries we will use the bin size to widen the time range but also as cache max age."
        >
          <Switch id="adx-caching" />
        </InlineField>

        <InlineField
          label="Cache max age"
          labelWidth={26}
          tooltip="By default the cache is disabled. If you want to enable the query caching please specify a max timespan for the cache to live."
        >
          <Input id="adx-cache-age" placeholder="0m" width={18} />
        </InlineField>

        <InlineField label="Data consistency" labelWidth={26}>
          <Select onChange={() => {}} width={18} />
        </InlineField>

        <InlineField label="Default editor mode" labelWidth={26}>
          <Select onChange={() => {}} width={18} />
        </InlineField>
      </FieldSet>

      <FieldSet label="Database schema settings">
        <InlineField label="Default database" labelWidth={26}>
          <Select onChange={() => {}} />
        </InlineField>

        <Button variant="primary">Reload</Button>
        <Button variant="primary">Add mapping</Button>
      </FieldSet>

      <FieldSet label="Tracking">
        <InlineField label="Send username header to host" labelWidth={26}>
          <Switch id="adx-username-header" />
        </InlineField>
      </FieldSet>
    </>
  );
};

export default ConfigEditor;
