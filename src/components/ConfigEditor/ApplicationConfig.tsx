import React from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { Field, Input } from '@grafana/ui';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import { selectors } from 'test/selectors';

interface ApplicationConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

const ApplicationConfig: React.FC<ApplicationConfigProps> = ({ options, updateJsonData }) => {
  const { jsonData } = options;

  return (
    <Field label="Application name (Optional)" description="Application name to be displayed in ADX.">
      <Input
        aria-label="Application"
        data-testid={selectors.components.applicationEditor.application.input}
        value={jsonData.application}
        id="adx-application"
        placeholder="Grafana-ADX"
        width={60}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('application', ev.target.value)}
      />
    </Field>
  );
};

export default ApplicationConfig;
