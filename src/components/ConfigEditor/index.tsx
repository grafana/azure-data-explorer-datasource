import React, { useCallback, useEffect, useMemo } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { config } from '@grafana/runtime';
import ConfigHelp from './ConfigHelp';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, AdxDataSourceSettings } from 'types';
import OpenAIConfig from './OpenAIConfig';
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
  hasCredentials,
  updateCredentials,
} from './AzureCredentialsConfig';
import AzureCredentialsForm from './AzureCredentialsForm';

export interface ConfigEditorProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {}

const ConfigEditor: React.FC<ConfigEditorProps> = (props) => {
  const { options, onOptionsChange } = props;
  const { jsonData } = options;

  const credentials = useMemo(() => getCredentials(options), [options]);

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
    <div data-testid="azure-data-explorer-config-editor">
      <ConfigHelp />

      <ConnectionConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />

      <h3 className="page-heading">Authentication</h3>
      <AzureCredentialsForm
        userIdentityEnabled={getUserIdentityEnabled()}
        managedIdentityEnabled={config.azure.managedIdentityEnabled}
        oboEnabled={getOboEnabled()}
        credentials={credentials}
        azureCloudOptions={KnownAzureClouds}
        onCredentialsChange={onCredentialsChange}
      />

      <QueryConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />

      <DatabaseConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />

      <TrackingConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />

      <OpenAIConfig options={options} updateJsonData={updateJsonData} onOptionsChange={onOptionsChange} />
    </div>
  );
};

export default ConfigEditor;
