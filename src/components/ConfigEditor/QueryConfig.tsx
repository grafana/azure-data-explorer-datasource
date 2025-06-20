import { Trans, t } from '@grafana/i18n';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { ConfigSubSection } from '@grafana/plugin-ui';
import { Field, Input, Select, Switch, TextLink } from '@grafana/ui';
import React, { useEffect, useMemo } from 'react';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, EditorMode } from 'types';

interface QueryConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

const QueryConfig: React.FC<QueryConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;

  const dataConsistencyOptions: Array<{ value: string; label: string }> = useMemo(() => [
    { value: 'strongconsistency', label: t('components.query-config.data-consistency-options.label.strong', 'Strong') },
    { value: 'weakconsistency', label: t('components.query-config.data-consistency-options.label.weak', 'Weak') },
  ], []);

  const editorModeOptions: Array<{ value: EditorMode; label: string }> = useMemo(() => [
    { value: EditorMode.Visual, label: t('components.query-config.editor-mode-options.label.visual', 'Visual') },
    { value: EditorMode.Raw, label: t('components.query-config.editor-mode-options.label.raw', 'Raw') },
  ], []);

  // Set some default values
  useEffect(() => {
    if (!jsonData.dataConsistency) {
      updateJsonData('dataConsistency', dataConsistencyOptions[0].value);
    }
    if (!jsonData.defaultEditorMode) {
      updateJsonData('defaultEditorMode', editorModeOptions[0].value);
    }
  }, [jsonData.dataConsistency, jsonData.defaultEditorMode, updateJsonData, dataConsistencyOptions, editorModeOptions]);

  return (
    <ConfigSubSection
      title={t('components.query-config.title-query-optimizations', 'Query Optimizations')}
      isCollapsible
      description={t(
        'components.query-config.description-various-settings-for-controlling-query-behavior',
        'Various settings for controlling query behavior.'
      )}
    >
      <Field
        label={t('components.query-config.label-query-timeout', 'Query timeout')}
        description={t(
          'components.query-config.description-value-controls-client-query-timeout',
          'This value controls the client query timeout.'
        )}
      >
        <Input
          value={jsonData.queryTimeout}
          id="adx-query-timeout"
          // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
          placeholder="30s"
          width={18}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('queryTimeout', ev.target.value)}
        />
      </Field>

      <Field
        label={t('components.query-config.label-use-dynamic-caching', 'Use dynamic caching')}
        description={t(
          'components.query-config.description-use-dynamic-caching',
          'By enabling this feature Grafana will dynamically apply cache settings on a per query basis and the default cache max age will be ignored. For time series queries we will use the bin size to widen the time range but also as cache max age.'
        )}
      >
        <Switch
          value={jsonData.dynamicCaching}
          id="adx-caching"
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('dynamicCaching', ev.target.checked)}
        />
      </Field>

      <Field
        label={t('components.query-config.label-cache-max-age', 'Cache max age')}
        description={t(
          'components.query-config.description-cache-max-age',
          'By default the cache is disabled. If you want to enable the query caching please specify a max timespan for the cache to live.'
        )}
      >
        <Input
          value={jsonData.cacheMaxAge}
          id="adx-cache-age"
          // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
          placeholder="0m"
          width={18}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('cacheMaxAge', ev.target.value)}
        />
      </Field>

      <Field
        label={t('components.query-config.label-data-consistency', 'Data consistency')}
        description={
          <span>
            <Trans i18nKey="components.query-config.description-data-consistency">
              Query consistency controls how queries and updates are synchronized. Defaults to Strong. For more
              information see the{' '}
              <TextLink
                href="https://learn.microsoft.com/en-us/azure/data-explorer/kusto/concepts/queryconsistency"
                external
              >
                Azure Data Explorer documentation.
              </TextLink>
            </Trans>
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
        label={t('components.query-config.label-default-editor-mode', 'Default editor mode')}
        description={t(
          'components.query-config.description-default-editor-mode',
          'This setting dictates which mode the editor will open in. Defaults to Visual.'
        )}
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
