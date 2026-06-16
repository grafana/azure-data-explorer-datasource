import { Trans, t } from '@grafana/i18n';
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
    <ConfigSubSection title={t('components.tracking-config.title-tracking', 'Tracking')} isCollapsible>
      <Field
        label={t('components.tracking-config.label-send-username-header-to-host', 'Send username header to host')}
        description={
          <span>
            <Trans
              i18nKey="components.tracking-config.description-send-username-header-to-host"
              values={{ userHeader: 'x-ms-user-id', clientRequestIdHeader: 'x-ms-client-request-id' }}
            >
              With this feature enabled, Grafana will pass the logged in user&#39;s username in the{' '}
              <code>{'{{userHeader}}'}</code> header and in the <code>{'{{clientRequestIdHeader}}'}</code> header when
              sending requests to ADX. Can be useful when tracking needs to be done in ADX.
            </Trans>
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
