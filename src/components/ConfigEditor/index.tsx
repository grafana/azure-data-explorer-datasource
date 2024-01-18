import React, { useCallback, useEffect, useMemo } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { config } from '@grafana/runtime';
import ConfigHelp from './ConfigHelp';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, AdxDataSourceSettings } from 'types';
import ConnectionConfig from './ConnectionConfig';
import DatabaseConfig from './DatabaseConfig';
import QueryConfig from './QueryConfig';
import TrackingConfig from './TrackingConfig';
import { AzureCredentials, KnownAzureClouds } from './AzureCredentials';
import {
  getCredentials,
  getDefaultCredentials,
  getOboEnabled,
  getUserIdentityEnabled,
  getWorkloadIdentityEnabled,
  hasCredentials,
  updateCredentials,
} from './AzureCredentialsConfig';
import AzureCredentialsForm from './AzureCredentialsForm';
import { DataSourceDescription, ConfigSection } from '@grafana/experimental';
import { Divider } from './Divider';

export interface ConfigEditorProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {}

const ConfigEditor: React.FC<ConfigEditorProps> = (props) => {
  const { options, onOptionsChange } = props;
  const { jsonData } = options;

  const credentials = useMemo(() => getCredentials(options), [options]);

  const hasAdditionalSettings = useMemo(
    () =>
      !!(
        options.jsonData.queryTimeout ||
        options.jsonData.dynamicCaching ||
        options.jsonData.cacheMaxAge ||
        options.jsonData.useSchemaMapping ||
        options.jsonData.enableUserTracking ||
        options.secureJsonFields['OpenAIAPIKey']
      ),
    [options]
  );

  const updateOptions = useCallback(
    (optionsFunc: (options: AdxDataSourceSettings) => AdxDataSourceSettings): void => {
      const updated = optionsFunc(options);
      onOptionsChange(updated);
    },
    [onOptionsChange, options]
  );

  const updateJsonData = useCallback(
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

  const onCredentialsChange = (credentials: AzureCredentials): void => {
    updateOptions((options) => updateCredentials(options, credentials));
  };

  useEffect(() => {
    if (!hasCredentials(options)) {
      updateOptions((options) => updateCredentials(options, getDefaultCredentials()));
    }
  }, [options, updateOptions]);

  return (
    <>
      <DataSourceDescription
        dataSourceName="Azure Data Explorer"
        docsLink="https://grafana.com/grafana/plugins/grafana-azure-data-explorer-datasource/"
        hasRequiredFields
      />
      <Divider />
      <ConfigHelp options={options} />
      <Divider />
      <AzureCredentialsForm
        userIdentityEnabled={getUserIdentityEnabled()}
        managedIdentityEnabled={config.azure.managedIdentityEnabled}
        workloadIdentityEnabled={getWorkloadIdentityEnabled()}
        oboEnabled={getOboEnabled()}
        credentials={credentials}
        azureCloudOptions={KnownAzureClouds}
        onCredentialsChange={onCredentialsChange}
      />
      <Divider />
      <ConnectionConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
      <Divider />
      <ConfigSection
        title="Additional settings"
        description="Additional settings are optional settings that can be configured for more control over your data source. This includes query optimizations, schema settings, tracking configuration, and OpenAI configuration."
        isCollapsible
        isInitiallyOpen={hasAdditionalSettings}
      >
        <QueryConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
        <DatabaseConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
        <TrackingConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
      </ConfigSection>
    </>
  );
};

export default ConfigEditor;
