import React, { useState, useCallback } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import ConfigHelp from 'components/ConfigEditor/ConfigHelp';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, AdxDataSourceSettings } from 'types';
import ConnectionConfig from './ConnectionConfig';
import DatabaseConfig from './DatabaseConfig';
import QueryConfig from './QueryConfig';
import TrackingConfig from './TrackingConfig';

export interface ConfigEditorProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {}

const ConfigEditor: React.FC<ConfigEditorProps> = (props) => {
  const { options, onOptionsChange: _onOptionsChange } = props;
  const [saved, setSaved] = useState(true);
  const { jsonData } = options;

  const onOptionsChange = useCallback(
    (options: AdxDataSourceSettings) => {
      setSaved(false);
      _onOptionsChange(options);
    },
    [setSaved, _onOptionsChange]
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

      <DatabaseConfig
        options={options}
        onOptionsChange={onOptionsChange}
        updateJsonData={updateJsonData}
        saved={saved}
        setSaved={setSaved}
      />

      <TrackingConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
    </div>
  );
};

export default ConfigEditor;
