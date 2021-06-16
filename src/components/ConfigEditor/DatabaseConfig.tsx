import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import {
  Button,
  FieldSet,
  HorizontalGroup,
  Icon,
  InlineField,
  InlineLabel,
  InlineSwitch,
  Input,
  Select,
  VerticalGroup,
} from '@grafana/ui';
import React, { useCallback, useMemo } from 'react';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import { Schema } from './refreshSchema';

interface DatabaseConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  schema: Schema;
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
  onRefresh: () => void;
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

const DatabaseConfig = ({ options, schema, updateJsonData, onRefresh }: DatabaseConfigProps) => {
  const { jsonData } = options;
  const mappings = useMemo(() => jsonData.schemaMappings ?? [], [jsonData.schemaMappings]);

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

  return (
    <FieldSet label="Database schema settings">
      <InlineField label="Default database" labelWidth={26}>
        <Select
          width={45}
          options={schema.databases}
          value={schema.databases.find((v) => v.value === jsonData.defaultDatabase)}
          onChange={(change: SelectableValue<string>) => updateJsonData('defaultDatabase', change.value || '')}
        />
      </InlineField>

      <InlineField label="Use managed schema" labelWidth={26}>
        <InlineSwitch
          id="adx-use-schema-mapping"
          value={jsonData.useSchemaMapping}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('useSchemaMapping', ev.target.checked)}
        />
      </InlineField>

      {jsonData.useSchemaMapping && (
        <InlineField label="Schema mappings" labelWidth={26}>
          <VerticalGroup spacing="xs">
            {mappings.map((mapping, index) => (
              <HorizontalGroup spacing="xs" key={index}>
                <Select
                  value={schema.schemaMappingOptions.find((v) => v.value === mapping.value)}
                  options={schema.schemaMappingOptions}
                  onChange={(change) => handleMappingTargetChange(index, change)}
                  width={38}
                  placeholder="Target"
                />

                <InlineLabel>
                  <Icon name="arrow-right" />
                </InlineLabel>
                <Input
                  placeholder="Name"
                  value={mapping.displayName}
                  onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                    handleMappingNameChange(index, ev.target.value)
                  }
                />
                <Button
                  variant="secondary"
                  size="md"
                  icon="trash-alt"
                  aria-label="Remove"
                  type="button"
                  onClick={() => handleRemoveMapping(index)}
                ></Button>
              </HorizontalGroup>
            ))}

            <Button variant="secondary" size="md" onClick={handleAddNewMapping} type="button">
              Add mapping
            </Button>
          </VerticalGroup>
        </InlineField>
      )}

      <br />

      <Button variant="primary" onClick={onRefresh} type="button" icon="sync">
        Reload schema
      </Button>
    </FieldSet>
  );
};

export default DatabaseConfig;
