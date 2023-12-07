import React, { useCallback, useEffect, useState } from 'react';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { Field, Select } from '@grafana/ui';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import { selectors } from 'test/selectors';
import { ConfigSection } from '@grafana/experimental';
import { parseClustersResponse } from 'response_parser';
import { getBackendSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';

interface ConnectionConfigProps
  extends DataSourcePluginOptionsEditorProps<AdxDataSourceOptions, AdxDataSourceSecureOptions> {
  updateJsonData: <T extends keyof AdxDataSourceOptions>(fieldName: T, value: AdxDataSourceOptions[T]) => void;
}

const ConnectionConfig: React.FC<ConnectionConfigProps> = (props: ConnectionConfigProps) => {
  const { onOptionsChange, options } = props;
  const [clusters, setClusters] = useState<SelectableValue[]>([]);

  const onClusterChange = useCallback((value: SelectableValue | undefined) => {
    onOptionsChange({
      ...options,
      jsonData: { ...options.jsonData, clusterUrl: value ? value.value : undefined },
    });
  }, [onOptionsChange, options]);

  useEffect(() => {
    const gettingClusters = async () => {
      if (!options.jsonData || !getClusters) {
        setClusters([]);
        return;
      }
      let canceled = false;
      getClusters(options.uid).then((result) => {
        if (!canceled) {
          setClusters(result);
        }
      });
      return () => {
        canceled = true;
      };
    };
    gettingClusters().catch(console.error);
  }, [options.jsonData, options.uid])

  return (
    <ConfigSection title="Connection Details">
      <Field
        label="Default cluster URL"
        description="The default cluster url for this data source. Enter a cluster URL or Save & Test to get a list of available clusters."
      >
        <Select
        aria-label="Cluster URL"
        data-testid={selectors.components.configEditor.clusterURL.input}
        value={options.jsonData.clusterUrl}
        options={clusters}
        width={60}
        onChange={onClusterChange}
        allowCustomValue={true}
      />
      </Field>
    </ConfigSection>
  );
};

const getClusters = async (pluginUid: string) => {
  try {
    const res = await lastValueFrom(
      getBackendSrv().fetch({ url: `/api/datasources/uid/${pluginUid}/resources/clusters`, method: 'GET' })
    );
    return parseClustersResponse(res);
  } catch (err) {
    return Promise.resolve([]);
  }
};

export default ConnectionConfig;
