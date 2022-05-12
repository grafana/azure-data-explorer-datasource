import React, { useEffect, useState, useCallback } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { FetchResponse, getDataSourceSrv } from '@grafana/runtime';
import ConfigHelp from 'components/ConfigEditor/ConfigHelp';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import ConnectionConfig from './ConnectionConfig';
import DatabaseConfig from './DatabaseConfig';
import QueryConfig from './QueryConfig';
import { refreshSchema, Schema } from './refreshSchema';
import TrackingConfig from './TrackingConfig';
import { Alert } from '@grafana/ui';
import { AdxDataSource } from 'datasource';

export interface ConfigEditorProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {}

type FetchErrorResponse = FetchResponse<{
  error?: string;
  message?: string;
  response?: string;
}>;

const ConfigEditor: React.FC<ConfigEditorProps> = (props) => {
  const { options, onOptionsChange } = props;
  const [schema, setSchema] = useState<Schema>({ databases: [], schemaMappingOptions: [] });
  const [schemaError, setSchemaError] = useState<FetchErrorResponse['data']>();
  const { jsonData } = options;

  const getDatasource = useCallback(async (): Promise<AdxDataSource> => {
    const datasource = await getDataSourceSrv().get(options.name);
    return datasource as unknown as AdxDataSource;
  }, [options.name]);

  const updateSchema = useCallback(async () => {
    // no credentials, can't request datasource yet
    if (!options.secureJsonFields || Object.keys(options.secureJsonFields).length === 0) {
      return;
    }

    try {
      const datasource = await getDatasource();
      const schemaData = await refreshSchema(datasource);

      if (!schemaData) {
        return;
      }

      setSchema(schemaData);
      setSchemaError(undefined);
    } catch (err: any) {
      // TODO: make sure err.data is the format we are expecting
      setSchemaError(err.data);
    }
  }, [getDatasource, options.secureJsonFields]);

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
    options.id && updateSchema();
  }, [options.id, updateSchema]);

  useEffect(() => {
    if (!jsonData.defaultDatabase && schema?.databases.length) {
      updateJsonData('defaultDatabase', schema?.databases[0].value);
    }
  }, [schema?.databases, jsonData.defaultDatabase, updateJsonData]);

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
        schema={schema}
        options={options}
        onOptionsChange={onOptionsChange}
        updateJsonData={updateJsonData}
        onRefresh={updateSchema}
      />

      <TrackingConfig options={options} onOptionsChange={onOptionsChange} updateJsonData={updateJsonData} />

      {schemaError && (
        <Alert severity="error" title="Error updating Azure Data Explorer schema">
          {schemaError.message}
        </Alert>
      )}
    </div>
  );
};

export default ConfigEditor;
