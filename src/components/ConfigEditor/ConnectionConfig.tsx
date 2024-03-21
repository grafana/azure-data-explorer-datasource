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
    <Field label="Default cluster URL (Optional)" description="The default cluster url for this data source.">
      <Input
        aria-label="Cluster URL"
        data-testid={selectors.components.configEditor.clusterURL.input}
        value={jsonData.clusterUrl}
        id="adx-cluster-url"
        placeholder="https://yourcluster.kusto.windows.net"
        width={60}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('clusterUrl', ev.target.value)}
      />
    </Field>
  );
};

export default ConnectionConfig;
