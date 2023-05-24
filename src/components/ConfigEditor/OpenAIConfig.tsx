import React, { ChangeEvent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { Button, FieldSet, Input, InlineField, InlineFieldRow } from '@grafana/ui';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';

interface Props extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

export function OpenAIConfig(props: Props) {
  const { options, onOptionsChange } = props;
  const { secureJsonData, secureJsonFields } = options;

  const onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        OpenAIAPIKey: event.target.value,
      },
    });
  };

  const onResetAPIKey = () => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        apiKey: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        OpenAIAPIKey: '',
      },
    });
  };

  return (
    <FieldSet label="OpenAI API Key" className="gf-form-group">
      <InlineFieldRow>
        <InlineField label="OpenAI API Key" labelWidth={18} htmlFor="openai-api-key">
          <Input
            id="openai-api-key"
            aria-label="OpenAI API Key"
            placeholder={secureJsonFields?.OpenAIAPIKey ? 'configured' : ''}
            value={secureJsonData?.OpenAIAPIKey ?? ''}
            onChange={onAPIKeyChange}
            data-testid={'openai-api-key'}
          />
        </InlineField>
        <InlineField>
          <Button variant="secondary" type="button" onClick={onResetAPIKey}>
            Reset
          </Button>
        </InlineField>
      </InlineFieldRow>
    </FieldSet>
  );
}

export default OpenAIConfig;
