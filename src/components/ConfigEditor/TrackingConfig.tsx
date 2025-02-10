import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { ConfigSubSection } from '@grafana/plugin-ui';
import { Field, Switch } from '@grafana/ui';
import React from 'react';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';

interface TrackingConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

const TrackingConfig: React.FC<TrackingConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;

  return (
    <ConfigSubSection title="Tracking" isCollapsible>
      <Field
        label="Send username header to host"
        description={
          <span>
            With this feature enabled, Grafana will pass the logged in user&#39;s username in the{' '}
            <code>x-ms-user-id</code> header and in the <code>x-ms-client-request-id</code> header when sending requests
            to ADX. Can be useful when tracking needs to be done in ADX.
          </span>
        }
      >
        <Switch
          id="adx-username-header"
          value={jsonData.enableUserTracking}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
            updateJsonData('enableUserTracking', ev.target.checked)
          }
        />
      </Field>
    </ConfigSubSection>
  );
};

export default TrackingConfig;
