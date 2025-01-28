import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { FetchError, FetchResponse, getBackendSrv, getDataSourceSrv } from '@grafana/runtime';
import { Alert, Button, Icon, Field, InlineLabel, Input, Select, Switch, Stack } from '@grafana/ui';
import { AdxDataSource } from 'datasource';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useEffectOnce } from 'react-use';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, AdxDataSourceSettings } from 'types';
import { hasCredentials } from './AzureCredentialsConfig';
import { refreshSchema, Schema } from './refreshSchema';
import { ConfigSubSection } from '@grafana/plugin-ui';

interface DatabaseConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

function formatMappingValue(mapping): string {
  switch (mapping?.type) {
    case 'function':
      const input = mapping.input ?? [];
      return `${mapping.value}(${input.map((i) => i.Value).join(',')})`;
    default:
      return mapping.value;
  }
}

function isFetchError(e: unknown): e is FetchError {
  return typeof e === 'object' && e !== null && 'status' in e && 'data' in e;
}

type FetchErrorResponse = FetchResponse<{
  error?: string;
  message?: string;
  response?: string;
}>;

const DatabaseConfig: React.FC<DatabaseConfigProps> = (props: DatabaseConfigProps) => {
  const { options, updateJsonData } = props;
  const { jsonData } = options;
  const mappings = useMemo(() => jsonData.schemaMappings ?? [], [jsonData.schemaMappings]);
  const [schema, setSchema] = useState<Schema>({ databases: [], schemaMappingOptions: [] });
  const [schemaError, setSchemaError] = useState<FetchErrorResponse['data']>();
  const baseURL = `/api/datasources/${options.id}`;

  const getDatasource = async (): Promise<AdxDataSource> => {
    const datasource = await getDataSourceSrv().get(options.name);
    return datasource as unknown as AdxDataSource;
  };

  const handleAddNewMapping = useCallback(() => {
    updateJsonData('schemaMappings', [...mappings, {}]);
  }, [mappings, updateJsonData]);

  const handleMappingTargetChange = (index: number, change: SelectableValue<string>) => {
    const target = change.value && schema.schemaMappingOptions?.find((v) => v.value === change.value);
    if (!target) {
      return;
    }

    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      database: target.database,
      type: target.type,
      name: target.value,
      value: formatMappingValue(target),
    };

    updateJsonData('schemaMappings', newMappings);
  };

  const handleMappingNameChange = (index: number, value: string) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      displayName: value,
    };

    updateJsonData('schemaMappings', newMappings);
  };

  const handleRemoveMapping = (index: number) => {
    const newMappings = [...mappings];
    newMappings.splice(index, 1);
    updateJsonData('schemaMappings', newMappings);
  };

  const canGetSchema = () => options.jsonData.clusterUrl && hasCredentials(options);

  const updateSchema = async () => {
    try {
      const datasource = await getDatasource();
      const schemaData = await refreshSchema(datasource);
      if (!schemaData) {
        return;
      }

      setSchema(schemaData);
      setSchemaError(undefined);
    } catch (err: unknown) {
      if (isFetchError(err)) {
        setSchemaError(err.data);
        setSchema({ databases: [], schemaMappingOptions: [] });
      }
    }
  };

  const saveAndUpdateSchema = async () => {
    // Save latest changes in the datasource so we can retrieve the schema
    await getBackendSrv()
      .put(baseURL, props.options)
      .then((result: { datasource: AdxDataSourceSettings }) => {
        props.onOptionsChange({
          ...props.options,
          version: result.datasource.version,
        });
      });

    updateSchema();
  };

  useEffectOnce(() => {
    if (options.id && canGetSchema()) {
      updateSchema();
    }
  });

  useEffect(() => {
    if (!jsonData.defaultDatabase && schema?.databases.length) {
      updateJsonData('defaultDatabase', schema?.databases[0].value);
    }
  }, [schema?.databases, jsonData.defaultDatabase, updateJsonData]);

  return (
    <ConfigSubSection
      title="Database schema settings"
      isCollapsible
      description="Configuration for the database schema including the default database."
    >
      <Field label="Default database">
        <div className="width-30" style={{ display: 'flex', gap: '4px' }}>
          <Select
            options={schema.databases}
            value={schema.databases.find((v) => v.value === jsonData.defaultDatabase)}
            onChange={(change: SelectableValue<string>) => updateJsonData('defaultDatabase', change.value || '')}
            aria-label="choose default database"
          />
          <Button variant="primary" onClick={saveAndUpdateSchema} disabled={!canGetSchema()} type="button" icon="sync">
            Reload schema
          </Button>
        </div>
      </Field>

      <Field
        label="Use managed schema"
        description="If enabled, allows tables, functions, and materialized views to be mapped to user friendly names."
      >
        <Switch
          id="adx-use-schema-mapping"
          value={jsonData.useSchemaMapping}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('useSchemaMapping', ev.target.checked)}
        />
      </Field>

      {jsonData.useSchemaMapping && (
        <Field label="Schema mappings">
          <Stack gap={0.25} direction={'column'} justifyContent={'flex-start'}>
            {mappings.map((mapping, index) => (
              <Stack gap={0.25} key={index} direction={'row'} justifyContent={'flex-start'}>
                <Select
                  value={schema.schemaMappingOptions.find((v) => v.value === mapping.value)}
                  options={schema.schemaMappingOptions}
                  onChange={(change) => handleMappingTargetChange(index, change)}
                  placeholder="Target"
                  width={50}
                />

                <InlineLabel width={5}>
                  <Icon name="arrow-right" />
                </InlineLabel>
                <Input
                  placeholder="Name"
                  value={mapping.displayName}
                  onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                    handleMappingNameChange(index, ev.target.value)
                  }
                  width={50}
                />
                <Button
                  variant="secondary"
                  size="md"
                  icon="trash-alt"
                  aria-label="Remove"
                  type="button"
                  onClick={() => handleRemoveMapping(index)}
                  fullWidth={false}
                ></Button>
              </Stack>
            ))}

            <Button
              variant="secondary"
              size="md"
              onClick={handleAddNewMapping}
              type="button"
              style={{ width: '130px' }}
            >
              Add mapping
            </Button>
          </Stack>
        </Field>
      )}

      {schemaError && (
        <Alert severity="error" title="Error updating Azure Data Explorer schema">
          {schemaError.message}
        </Alert>
      )}
    </ConfigSubSection>
  );
};

export default DatabaseConfig;
