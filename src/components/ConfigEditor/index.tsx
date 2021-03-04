import React, { useEffect, useState, useCallback } from 'react';
import { DataSourcePluginOptionsEditorProps, updateDatasourcePluginResetOption } from '@grafana/data';
import ConfigHelp from 'components/ConfigEditor/ConfigHelp';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import ConnectionConfig from './ConnectionConfig';
import DatabaseConfig from './DatabaseConfig';
import QueryConfig from './QueryConfig';
import { refreshSchema, Schema } from './refreshSchema';
import TrackingConfig from './TrackingConfig';

interface ConfigEditorProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {}

const ConfigEditor: React.FC<ConfigEditorProps> = props => {
  const { options, onOptionsChange } = props;
  const [schema, setSchema] = useState<Schema>({ databases: [], schemaMappingOptions: [] });
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

  useEffect(() => {
    if (options.id) {
      refreshSchema(options.url).then(data => setSchema(data));
    }
  }, [options.id, options.url]);

  useEffect(() => {
    if (!jsonData.defaultDatabase && schema?.databases.length) {
      updateJsonData('defaultDatabase', schema?.databases[0].value);
    }
  }, [schema?.databases, jsonData.defaultDatabase, updateJsonData]);

  const handleRefreshClick = useCallback(() => {
    refreshSchema(options.url).then(data => setSchema(data));
  }, [options.url]);

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
    <>
      <ConfigHelp />

      <ConnectionConfig
        options={options}
        onOptionsChange={onOptionsChange}
        updateJsonData={updateJsonData}
        handleClearClientSecret={handleClearClientSecret}
      />

      <QueryConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />

      <DatabaseConfig
        schema={schema}
        options={options}
        onOptionsChange={onOptionsChange}
        updateJsonData={updateJsonData}
        onRefresh={handleRefreshClick}
      />

      <TrackingConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />
    </>
  );
};

export default ConfigEditor;
