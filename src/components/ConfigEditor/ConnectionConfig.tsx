import React from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { FieldSet, InlineField, Input } from '@grafana/ui';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import { selectors } from 'test/selectors';

interface ConnectionConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

const LABEL_WIDTH = 18;

const ConnectionConfig: React.FC<ConnectionConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;

  return (
    <FieldSet label="Connection Details">
      <InlineField
        label="Cluster URL"
        labelWidth={LABEL_WIDTH}
        tooltip="The cluster url for your Azure Data Explorer database."
      >
        <Input
          data-testid={selectors.components.configEditor.clusterURL.input}
          value={jsonData.clusterUrl}
          id="adx-cluster-url"
          placeholder="https://yourcluster.kusto.windows.net"
          width={60}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('clusterUrl', ev.target.value)}
        />
      </InlineField>
    </FieldSet>
  );
};

export default ConnectionConfig;
