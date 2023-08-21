import React, { ChangeEvent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { Button, Input, Field, InlineFieldRow } from '@grafana/ui';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import { ConfigSubSection } from '@grafana/experimental';

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
    <ConfigSubSection title="OpenAI Configuration" isCollapsible>
      <InlineFieldRow>
        <Field
          label="OpenAI API Key"
          htmlFor="openai-api-key"
          description="Supplying an OpenAI API key will allow users to make use of the generate queries feature."
        >
          <div className="width-30" style={{ display: 'flex', gap: '4px' }}>
            <Input
              id="openai-api-key"
              aria-label="OpenAI API Key"
              placeholder={secureJsonFields?.OpenAIAPIKey ? 'configured' : ''}
              value={secureJsonData?.OpenAIAPIKey ?? ''}
              onChange={onAPIKeyChange}
              data-testid={'openai-api-key'}
            />
            <Button variant="secondary" type="button" onClick={onResetAPIKey}>
              Reset
            </Button>
          </div>
        </Field>
      </InlineFieldRow>
    </ConfigSubSection>
  );
}

export default OpenAIConfig;
