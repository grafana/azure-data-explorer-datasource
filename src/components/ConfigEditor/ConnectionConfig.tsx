import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { FieldSet, InlineField, InlineSwitch, Input, LegacyForms, Select } from '@grafana/ui';
import React, { useEffect } from 'react';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, AzureCloudType } from 'types';

const { SecretFormField } = LegacyForms;
const azureClouds: Array<SelectableValue<AzureCloudType>> = [
  { value: AzureCloudType.AzurePublic, label: 'Azure' },
  { value: AzureCloudType.AzureUSGovernment, label: 'Azure US Government' },
  { value: AzureCloudType.AzureChina, label: 'Azure China' },
];

interface ConnectionConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
  handleClearClientSecret: () => void;
}

const ConnectionConfig: React.FC<ConnectionConfigProps> = ({
  options,
  onOptionsChange,
  updateJsonData,
  handleClearClientSecret,
}) => {
  const { jsonData, secureJsonData, secureJsonFields } = options;

  // Set some default values
  useEffect(() => {
    if (!jsonData.azureCloud) {
      updateJsonData('azureCloud', AzureCloudType.AzurePublic);
    }
    if (!jsonData.oauthPassThru) {
      updateJsonData('oauthPassThru', true);
    }
  }, [jsonData.azureCloud, jsonData.oauthPassThru, updateJsonData]);

  const handleClientSecretChange = (ev?: React.ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...secureJsonData,
        // it's false when we unset it
        clientSecret: ev ? ev.target.value : false,
      },
    });
  };

  const clientSecretTooltip = (
    <>
      To create a new key, log in to Azure Portal, navigate to Azure Active Directory {'🡒'} App Registrations
      {' 🡒 '} Choose your app {'🡒'} Keys.
      <br />
      <br />
      <a
        target="_blank"
        rel="noreferrer"
        href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal"
      >
        Click here for detailed instructions on setting up an Azure Active Directory (AD) application.
      </a>
    </>
  );

  return (
    <FieldSet label="Connection Details">
      <InlineField label="Azure cloud" labelWidth={26} tooltip="Select an Azure Cloud." required>
        <Select
          options={azureClouds}
          value={azureClouds.find((v) => v.value === jsonData.azureCloud)}
          onChange={(change: SelectableValue<AzureCloudType>) =>
            updateJsonData('azureCloud', change.value ? change.value : AzureCloudType.AzurePublic)
          }
          isClearable={false}
          width={60}
        />
      </InlineField>

      <InlineField label="Cluster URL" labelWidth={26} tooltip="The cluster url for your Azure Data Explorer database.">
        <Input
          value={jsonData.clusterUrl}
          id="adx-cluster-url"
          placeholder="https://yourcluster.kusto.windows.net"
          width={60}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('clusterUrl', ev.target.value)}
        />
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
              rel="noreferrer"
              href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal"
            >
              Click here for detailed instructions on setting up an Azure Active Directory (AD) application.
            </a>
          </>
        }
      >
        <Input
          value={jsonData.tenantId}
          id="adx-tenant-id"
          width={60}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('tenantId', ev.target.value)}
        />
      </InlineField>

      <InlineField
        label="Client ID"
        labelWidth={26}
        tooltip={
          <>
            In the Azure Portal, navigate to Azure Active Directory {'🡒'} App Registrations {'🡒'} Choose your app {'🡒'}
            Application ID.
            <br />
            <br />
            <a
              target="_blank"
              rel="noreferrer"
              href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal"
            >
              Click here for detailed instructions on setting up an Azure Active Directory (AD) application.
            </a>
          </>
        }
      >
        <Input
          value={jsonData.clientId}
          id="adx-client-id"
          width={60}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('clientId', ev.target.value)}
        />
      </InlineField>

      <SecretFormField
        label="Client secret"
        value={secureJsonData?.clientSecret || undefined}
        labelWidth={13}
        inputWidth={30}
        placeholder=""
        onReset={() => handleClearClientSecret()}
        onChange={handleClientSecretChange}
        isConfigured={!!secureJsonFields?.clientSecret}
        tooltip={clientSecretTooltip}
      />

      <InlineField
        label="Use On-Behalf-Of"
        labelWidth={26}
        tooltip={
          <>
            Propagate Grafana client credentials to ADX with a token exchange. When enabled the service account (Client
            ID) impersonates the user by augmenting the access token. See the{' '}
            <a
              target="_blank"
              rel="noreferrer"
              href="https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow"
            >
              developer documentation
            </a>{' '}
            for detail on the concept.
          </>
        }
      >
        <InlineSwitch
          id="adx-on-behalf-of"
          value={jsonData.onBehalfOf}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('onBehalfOf', ev.target.checked)}
        />
      </InlineField>
    </FieldSet>
  );
};

export default ConnectionConfig;
