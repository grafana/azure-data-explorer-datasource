import React, { useCallback, useEffect, useState } from 'react';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { Button, Field, Select } from '@grafana/ui';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from 'types';
import { selectors } from 'test/selectors';
import { ConfigSection } from '@grafana/experimental';
import { parseClustersResponse } from 'response_parser';
import { getBackendSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';


const getClusters = async (pluginUid: string) => {
  try {
    //await saveOptions();
    const res = await lastValueFrom(
      getBackendSrv().fetch({ url: `/api/datasources/uid/${pluginUid}/resources/clusters`, method: 'GET' })
    );
    return parseClustersResponse(res);
  } catch (err) {
    return Promise.resolve([]);
  }
};

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

  const updateClusters = useCallback((received: Array<SelectableValue<string>>, clusterUrl: string) => {
    setClusters(received);
    if (clusterUrl && received.length > 0) {
      // Selecting the default cluster if clusters are received and there is no default
      onClusterChange(received[0]);
      return;
    }
    const found = received.find((opt) => opt.value === clusterUrl);
    if (!found) {
      onClusterChange(undefined);
    }
  }, [onClusterChange]);

  useEffect(()=> {
    const basdf = async () => {
      if (!options.jsonData || !getClusters) {
        setClusters([]);
        return;
      }
      let canceled = false;
      getClusters(options.uid).then((result) => {
        if (!canceled) {
          updateClusters(result, options.jsonData.clusterUrl);
        }
      });
      return () => {
        canceled = true;
      };
    };
    basdf();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ConfigSection title="Connection Details">
      <Field
        label="Default cluster url"
        description="The default cluster url for your Azure Data Explorer database."
      >
        <div className="width-30" style={{ display: 'flex', gap: '4px' }}>
        <Select
        aria-label="Cluster URL"
        data-testid={selectors.components.configEditor.clusterURL.input}
        value={options.jsonData.clusterUrl}
        options={clusters}
        width={60}
        onChange={onClusterChange}
        allowCustomValue={true}
      />
      <Button
        variant="secondary"
        type="button"
      >
        Load Clusters
      </Button>
      </div>
      </Field>
    </ConfigSection>
  );
};

export default ConnectionConfig;
