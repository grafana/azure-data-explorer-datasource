import { t } from '@grafana/i18n';
import React from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { Field, Input } from '@grafana/ui';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import { selectors } from 'test/selectors';

interface ConnectionConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

const ConnectionConfig: React.FC<ConnectionConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;

  return (
    <Field
      label={t('components.connection-config.label-default-cluster-url-optional', 'Default cluster URL (Optional)')}
      description={t(
        'components.connection-config.description-default-cluster-source',
        'The default cluster url for this data source.'
      )}
    >
      <Input
        aria-label={t('components.connection-config.aria-label-cluster-url', 'Cluster URL')}
        data-testid={selectors.components.configEditor.clusterURL.input}
        value={jsonData.clusterUrl}
        id="adx-cluster-url"
        // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
        placeholder="https://yourcluster.kusto.windows.net"
        width={60}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('clusterUrl', ev.target.value)}
      />
    </Field>
  );
};

export default ConnectionConfig;
