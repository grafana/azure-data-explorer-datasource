import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { FieldSet, InlineField, Input, LegacyForms, Select } from '@grafana/ui';
import React, { useEffect } from 'react';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import nationalClouds from '../../nationalClouds.json';

const { SecretFormField } = LegacyForms;

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
    if (!jsonData.nationalCloud) {
      updateJsonData('nationalCloud', nationalClouds[0].value);
    }
  }, [jsonData.nationalCloud, updateJsonData]);

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
        href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal"
      >
        Click here for detailed instructions on setting up an Azure Active Directory (AD) application.
      </a>
    </>
  );

  return (
    <FieldSet label="Connection Details">
      <InlineField label="Azure national cloud" labelWidth={26} tooltip="Select an Azure National Cloud.">
        <Select
          options={nationalClouds}
          value={nationalClouds.find(v => v.value === jsonData.nationalCloud)}
          onChange={(change: SelectableValue<string>) =>
            updateJsonData('nationalCloud', change.value ? change.value : nationalClouds[0].value)
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
        isConfigured={!!secureJsonData?.clientSecret || !!secureJsonFields?.clientSecret}
        // tooltip is typed too strictly (it can safely accept ReactNode), and has been fixed in https://github.com/grafana/grafana/pull/31310
        // but we just cast it to string to satisfy the types until we can upgrade
        tooltip={(clientSecretTooltip as unknown) as string}
      />
    </FieldSet>
  );
};

export default ConnectionConfig;
