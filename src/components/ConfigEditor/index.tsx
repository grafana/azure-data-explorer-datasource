import React, { useCallback, useEffect, useMemo } from 'react';
import { AzureCredentials, getAzureClouds } from '@grafana/azure-sdk';
import { FeatureToggles, DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { Switch, InlineField } from '@grafana/ui';
import { config } from '@grafana/runtime';
import { gte } from 'semver';
import ConfigHelp from './ConfigHelp';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, AdxDataSourceSettings } from 'types';
import ConnectionConfig from './ConnectionConfig';
import DatabaseConfig from './DatabaseConfig';
import QueryConfig from './QueryConfig';
import TrackingConfig from './TrackingConfig';
import ApplicationConfig from './ApplicationConfig';
import {
  getCredentials,
  getDefaultCredentials,
  getOboEnabled,
  hasCredentials,
  updateCredentials,
} from './AzureCredentialsConfig';
import AzureCredentialsForm from './AzureCredentialsForm';
import { DataSourceDescription, ConfigSection } from '@grafana/plugin-ui';
import { Divider } from './Divider';
import { css } from '@emotion/css';

const styles = {
  toggle: css`
    margin-top: 7px;
    margin-left: 5px;
  `,
};

export interface ConfigEditorProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {}

const ConfigEditor: React.FC<ConfigEditorProps> = (props) => {
  const { options, onOptionsChange } = props;
  const { jsonData } = options;

  const clouds = useMemo(() => {
    return getAzureClouds().map<SelectableValue>((c) => {
      return { value: c.name, label: c.displayName };
    });
  }, []);

  const credentials = useMemo(() => getCredentials(options), [options]);

  const hasAdditionalSettings = useMemo(
    () =>
      !!(
        options.jsonData.queryTimeout ||
        options.jsonData.dynamicCaching ||
        options.jsonData.cacheMaxAge ||
        options.jsonData.useSchemaMapping ||
        options.jsonData.enableUserTracking ||
        options.jsonData.application ||
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
        userIdentityEnabled={config.azure.userIdentityEnabled}
        managedIdentityEnabled={config.azure.managedIdentityEnabled}
        workloadIdentityEnabled={config.azure.workloadIdentityEnabled}
        oboEnabled={getOboEnabled()}
        credentials={credentials}
        azureCloudOptions={clouds}
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
        <ApplicationConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
        <TrackingConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
      </ConfigSection>

      <Divider />
      {config.featureToggles['secureSocksDSProxyEnabled' as keyof FeatureToggles] &&
        gte(config.buildInfo.version, '10.0.0') && (
          <>
            <div className="gf-form-group">
              <h3 className="page-heading">Secure Socks Proxy</h3>
              <br />
              <InlineField
                label="Enable"
                tooltip={
                  <>
                    Enable proxying the datasource connection through the secure socks proxy to a different network. See{' '}
                    <a
                      href="https://grafana.com/docs/grafana/next/setup-grafana/configure-grafana/proxy/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Configure a datasource connection proxy.
                    </a>
                  </>
                }
              >
                <div className={styles.toggle}>
                  <Switch
                    value={options.jsonData.enableSecureSocksProxy}
                    onChange={(e) => {
                      onOptionsChange({
                        ...options,
                        jsonData: {
                          ...options.jsonData,
                          enableSecureSocksProxy: e.currentTarget.checked,
                        },
                      });
                    }}
                  />
                </div>
              </InlineField>
            </div>
          </>
        )}
    </>
  );
};

export default ConfigEditor;
