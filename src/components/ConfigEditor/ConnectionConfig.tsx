import React from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { Field, Input } from '@grafana/ui';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import { selectors } from 'test/selectors';
import { ConfigSection } from '@grafana/experimental';

interface ConnectionConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

const ConnectionConfig: React.FC<ConnectionConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;

  return (
    <ConfigSection title="Connection Details">
      <Field
        label="Cluster URL"
        description="The cluster url for your Azure Data Explorer database."
        required
        error={'Cluster URL is required'}
        invalid={!options.jsonData.clusterUrl}
      >
        <Input
          data-testid={selectors.components.configEditor.clusterURL.input}
          value={jsonData.clusterUrl}
          id="adx-cluster-url"
          placeholder="https://yourcluster.kusto.windows.net"
          width={60}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('clusterUrl', ev.target.value)}
        />
      </Field>
    </ConfigSection>
  );
};

export default ConnectionConfig;
