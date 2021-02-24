import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { FieldSet, Input, Button, InlineField, Switch, Select, LegacyForms } from '@grafana/ui';
import ConfigHelp from 'components/ConfigHelp';
import React, { useEffect, useState, useCallback } from 'react';
import { ResponseParser } from 'response_parser';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, EditorMode, SchemaMappingOption } from 'types';

const { SecretFormField } = LegacyForms;

export type Props = DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions>;

interface ConfigEditorProps extends Props {}

interface Schema {
  databases: Array<{
    text: string;
    value: string;
  }>;
  schemaMappingOptions: SchemaMappingOption[];
}

async function refreshSchema(): Promise<Schema> {
  const databases: Array<{ text: string; value: string }> = [];
  const schemaMappingOptions: SchemaMappingOption[] = [];

  const data = {
    querySource: 'schema',
    csl: `.show databases schema as json`,
  };

  const response = await getBackendSrv().datasourceRequest({
    url: `/azuredataexplorer/v1/rest/mgmt`,
    method: 'POST',
    data: data,
  });

  // TODO: cache???
  const schema = new ResponseParser().parseSchemaResult(response.data);

  for (const database of Object.values(schema.Databases)) {
    databases.push({
      text: database.Name,
      value: database.Name,
    });

    for (const table of Object.values(database.Tables)) {
      schemaMappingOptions.push({
        type: 'table',
        text: `${database.Name}/tables/${table.Name}`,
        value: table.Name,
        name: table.Name,
        database: database.Name,
      });
    }

    for (const func of Object.values(database.Functions)) {
      schemaMappingOptions.push({
        type: 'function',
        text: `${database.Name}/functions/${func.Name}`,
        value: func.Name,
        name: func.Name,
        input: func.InputParameters,
        database: database.Name,
      });
    }

    for (const view of Object.values(database.MaterializedViews)) {
      schemaMappingOptions.push({
        type: 'materializedView',
        text: `${database.Name}/materializedViews/${view.Name}`,
        value: view.Name,
        name: view.Name,
        database: database.Name,
      });
    }
  }

  return { databases, schemaMappingOptions };
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ options, onOptionsChange }) => {
  const [schema, setSchema] = useState<Schema>();
  const { jsonData, secureJsonData } = options;

  const handleFieldChange = useCallback(
    <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => {
      onOptionsChange({
        ...options,
        jsonData: {
          ...jsonData,
          [fieldName]: value,
        },
      });
    },
    [jsonData, onOptionsChange, options]
  );

  useEffect(() => {
    if (options.id) {
      refreshSchema().then(data => setSchema(data));
    }
  }, [options.id]);

  useEffect(() => {
    if (!jsonData.defaultDatabase && schema?.databases.length) {
      handleFieldChange('defaultDatabase', schema?.databases[0].value);
    }
    // TODO: test this dependency array functions as expected
  }, [schema?.databases, jsonData.defaultDatabase, handleFieldChange]);

  const handleRefreshClick = useCallback(() => {
    refreshSchema().then(data => setSchema(data));
  }, []);

  const dataConsistencyOptions: Array<SelectableValue<string>> = [
    { value: 'strongconsistency', label: 'Strong' },
    { value: 'weakconsistency', label: 'Weak' },
  ];

  const editorModeOptions: Array<SelectableValue<EditorMode>> = [
    { value: EditorMode.Visual, label: 'Visual' },
    { value: EditorMode.Raw, label: 'Raw' },
  ];

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
      <ConfigHelp />

      <FieldSet label="Connection Details">
        <InlineField
          label="Cluster URL"
          labelWidth={26}
          tooltip="The cluster url for your Azure Data Explorer database."
        >
          <Input
            value={jsonData.clusterUrl}
            id="adx-cluster-url"
            placeholder="https://yourcluster.kusto.windows.net"
            width={60}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('clusterUrl', ev.target.value)}
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
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('tenantId', ev.target.value)}
          />
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
          <Input
            value={jsonData.clientId}
            id="adx-client-id"
            width={60}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('clientId', ev.target.value)}
          />
        </InlineField>

        <SecretFormField
          label="Client secret"
          value={secureJsonData?.clientSecret}
          labelWidth={13}
          inputWidth={16}
          onReset={() => {}}
          isConfigured={!!secureJsonData?.clientSecret}
          // tooltip is typed too strictly (it can safely accept ReactNode), and has been fixed in https://github.com/grafana/grafana/pull/31310
          // but we just cast it to string to satisfy the types until we can upgrade
          tooltip={(clientSecretTooltip as unknown) as string}
        />
      </FieldSet>

      <FieldSet label="Query Optimizations">
        <InlineField label="Query timeout" labelWidth={26} tooltip="This value controls the client query timeout.">
          <Input value={jsonData.queryTimeout} id="adx-query-timeout" placeholder="30s" width={18} />
        </InlineField>

        <InlineField
          label="Use dynamic caching"
          labelWidth={26}
          tooltip="By enabling this feature Grafana will dynamically apply cache settings on a per query basis and the default cache max age will be ignored.<br /><br />For time series queries we will use the bin size to widen the time range but also as cache max age."
        >
          <Switch value={jsonData.dynamicCaching} id="adx-caching" />
        </InlineField>

        <InlineField
          label="Cache max age"
          labelWidth={26}
          tooltip="By default the cache is disabled. If you want to enable the query caching please specify a max timespan for the cache to live."
        >
          <Input value={jsonData.cacheMaxAge} id="adx-cache-age" placeholder="0m" width={18} />
        </InlineField>

        <InlineField label="Data consistency" labelWidth={26}>
          <Select
            options={dataConsistencyOptions}
            value={dataConsistencyOptions.find(v => v.value === jsonData.dataConsistency)}
            onChange={() => {}}
            width={18}
          />
        </InlineField>

        <InlineField label="Default editor mode" labelWidth={26}>
          <Select
            options={editorModeOptions}
            value={editorModeOptions.find(v => v.value === jsonData.defaultEditorMode)}
            onChange={() => {}}
            width={18}
          />
        </InlineField>
      </FieldSet>

      <FieldSet label="Database schema settings">
        <InlineField label="Default database" labelWidth={26}>
          <Select onChange={() => {}} />
        </InlineField>

        <Button variant="primary" onClick={handleRefreshClick}>
          Reload
        </Button>

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
