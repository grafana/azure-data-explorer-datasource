import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { FieldSet, InlineField, InlineSwitch, Input, Select } from '@grafana/ui';
import React, { useEffect } from 'react';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, EditorMode } from 'types';

interface QueryConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

const dataConsistencyOptions: Array<{ value: string; label: string }> = [
  { value: 'strongconsistency', label: 'Strong' },
  { value: 'weakconsistency', label: 'Weak' },
];

const editorModeOptions: Array<{ value: EditorMode; label: string }> = [
  { value: EditorMode.Visual, label: 'Visual' },
  { value: EditorMode.Raw, label: 'Raw' },
];

const QueryConfig = ({ options, updateJsonData }: QueryConfigProps) => {
  const { jsonData } = options;

  // Set some default values
  useEffect(() => {
    if (!jsonData.dataConsistency) {
      updateJsonData('dataConsistency', dataConsistencyOptions[0].value);
    }
    if (!jsonData.defaultEditorMode) {
      updateJsonData('defaultEditorMode', editorModeOptions[0].value);
    }
  }, [jsonData.dataConsistency, jsonData.defaultEditorMode, updateJsonData]);

  return (
    <FieldSet label="Query Optimizations">
      <InlineField label="Query timeout" labelWidth={26} tooltip="This value controls the client query timeout.">
        <Input
          value={jsonData.queryTimeout}
          id="adx-query-timeout"
          placeholder="30s"
          width={18}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('queryTimeout', ev.target.value)}
        />
      </InlineField>

      <InlineField
        label="Use dynamic caching"
        labelWidth={26}
        tooltip="By enabling this feature Grafana will dynamically apply cache settings on a per query basis and the default cache max age will be ignored.<br /><br />For time series queries we will use the bin size to widen the time range but also as cache max age."
      >
        <InlineSwitch
          value={jsonData.dynamicCaching}
          id="adx-caching"
          transparent={false}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('dynamicCaching', ev.target.checked)}
        />
      </InlineField>

      <InlineField
        label="Cache max age"
        labelWidth={26}
        tooltip="By default the cache is disabled. If you want to enable the query caching please specify a max timespan for the cache to live."
      >
        <Input
          value={jsonData.cacheMaxAge}
          id="adx-cache-age"
          placeholder="0m"
          width={18}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('cacheMaxAge', ev.target.value)}
        />
      </InlineField>

      <InlineField label="Data consistency" labelWidth={26} tooltip="Defaults to Strong">
        <Select
          options={dataConsistencyOptions}
          value={dataConsistencyOptions.find((v) => v.value === jsonData.dataConsistency)}
          onChange={(change: SelectableValue<string>) =>
            updateJsonData('dataConsistency', change.value ? change.value : dataConsistencyOptions[0].value)
          }
          isClearable={false}
          width={18}
        />
      </InlineField>

      <InlineField label="Default editor mode" labelWidth={26} tooltip="Defaults to Visual">
        <Select
          options={editorModeOptions}
          value={editorModeOptions.find((v) => v.value === jsonData.defaultEditorMode)}
          onChange={(change: SelectableValue<EditorMode>) =>
            updateJsonData('defaultEditorMode', change.value || EditorMode.Visual)
          }
          width={18}
        />
      </InlineField>
    </FieldSet>
  );
};

export default QueryConfig;
