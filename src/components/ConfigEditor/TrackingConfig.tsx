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
      <InlineField label="Send username header to host" labelWidth={26}>
        <InlineSwitch
          id="adx-username-header"
          value={jsonData.enableUserTracking}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
            // TODO: this is setting the wrong value???
            updateJsonData('enableUserTracking', ev.target.checked)
          }
        />
      </InlineField>
    </FieldSet>
  );
};

export default TrackingConfig;
