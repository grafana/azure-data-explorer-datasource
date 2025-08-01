import { t } from '@grafana/i18n';
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
    <Field
      label={t('components.application-config.label-application-name-optional', 'Application name (Optional)')}
      description={t(
        'components.application-config.description-application-displayed',
        'Application name to be displayed in ADX.'
      )}
    >
      <Input
        aria-label={t('components.application-config.aria-label-application', 'Application')}
        data-testid={selectors.components.applicationEditor.application.input}
        value={jsonData.application}
        id="adx-application"
        // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
        placeholder="Grafana-ADX"
        width={60}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => updateJsonData('application', ev.target.value)}
      />
    </Field>
  );
};

export default ApplicationConfig;
