import React, { useCallback } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import ConfigHelp from 'components/ConfigEditor/ConfigHelp';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import ConnectionConfig from './ConnectionConfig';
import DatabaseConfig from './DatabaseConfig';
import QueryConfig from './QueryConfig';
import TrackingConfig from './TrackingConfig';

export interface ConfigEditorProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {}

const ConfigEditor: React.FC<ConfigEditorProps> = (props) => {
  const { options, onOptionsChange } = props;
  const { jsonData } = options;

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

  const handleClearClientSecret = useCallback(() => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        clientSecret: false,
      },
      secureJsonFields: {
        ...options.secureJsonFields,
        clientSecret: false,
      },
    });
  }, [onOptionsChange, options]);

  return (
    <div data-testid="azure-data-explorer-config-editor">
      <ConfigHelp />

      <ConnectionConfig
        options={options}
        onOptionsChange={onOptionsChange}
        updateJsonData={updateJsonData}
        handleClearClientSecret={handleClearClientSecret}
      />

      <QueryConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />

      <DatabaseConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />

      <TrackingConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
    </div>
  );
};

export default ConfigEditor;
