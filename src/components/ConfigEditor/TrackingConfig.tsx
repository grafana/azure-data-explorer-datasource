import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { FieldSet, InlineField, InlineSwitch } from '@grafana/ui';
import React from 'react';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';

interface TrackingConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

const TrackingConfig: React.FC<TrackingConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;

  return (
    <FieldSet label="Tracking">
      <InlineField
        label="Send username header to host"
        labelWidth={26}
        tooltip={
          <p>
            With this feature enabled, Grafana will pass the logged in user&#39;s username in the{' '}
            <code>x-ms-user-id</code> header and in the <code>x-ms-client-request-id</code> header when sending requests
            to ADX. Can be useful when tracking needs to be done in ADX.{' '}
          </p>
        }
      >
        <InlineSwitch
          id="adx-username-header"
          value={jsonData.enableUserTracking}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
            updateJsonData('enableUserTracking', ev.target.checked)
          }
        />
      </InlineField>
    </FieldSet>
  );
};

export default TrackingConfig;
