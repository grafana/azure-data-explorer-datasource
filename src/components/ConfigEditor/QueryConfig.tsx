import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { ConfigSubSection } from '@grafana/plugin-ui';
import { Field, Input, Select, Switch } from '@grafana/ui';
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

const QueryConfig: React.FC<QueryConfigProps> = ({ options, updateJsonData }) => {
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
    <ConfigSubSection
      title="Query Optimizations"
      isCollapsible
      description="Various settings for controlling query behavior."
    >
      <Field label="Query timeout" description="This value controls the client query timeout.">
        <Input
          value={jsonData.queryTimeout}
          id="adx-query-timeout"
          placeholder="30s"
          width={18}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('queryTimeout', ev.target.value)}
        />
      </Field>

      <Field
        label="Use dynamic caching"
        description="By enabling this feature Grafana will dynamically apply cache settings on a per query basis and the default cache max age will be ignored. For time series queries we will use the bin size to widen the time range but also as cache max age."
      >
        <Switch
          value={jsonData.dynamicCaching}
          id="adx-caching"
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('dynamicCaching', ev.target.checked)}
        />
      </Field>

      <Field
        label="Cache max age"
        description="By default the cache is disabled. If you want to enable the query caching please specify a max timespan for the cache to live."
      >
        <Input
          value={jsonData.cacheMaxAge}
          id="adx-cache-age"
          placeholder="0m"
          width={18}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('cacheMaxAge', ev.target.value)}
        />
      </Field>

      <Field
        label="Data consistency"
        description={
          <span>
            Query consistency controls how queries and updates are synchronized. Defaults to Strong. For more
            information see the{' '}
            <a
              href="https://learn.microsoft.com/en-us/azure/data-explorer/kusto/concepts/queryconsistency"
              target="_blank"
              rel="noreferrer"
            >
              Azure Data Explorer documentation.
            </a>
          </span>
        }
      >
        <Select
          options={dataConsistencyOptions}
          value={dataConsistencyOptions.find((v) => v.value === jsonData.dataConsistency)}
          onChange={(change: SelectableValue<string>) =>
            updateJsonData('dataConsistency', change.value ? change.value : dataConsistencyOptions[0].value)
          }
          isClearable={false}
          width={18}
        />
      </Field>

      <Field
        label="Default editor mode"
        description="This setting dictates which mode the editor will open in. Defaults to Visual."
      >
        <Select
          options={editorModeOptions}
          value={editorModeOptions.find((v) => v.value === jsonData.defaultEditorMode)}
          onChange={(change: SelectableValue<EditorMode>) =>
            updateJsonData('defaultEditorMode', change.value || EditorMode.Visual)
          }
          width={18}
        />
      </Field>
    </ConfigSubSection>
  );
};

export default QueryConfig;
