import React, { useCallback, useEffect, useState } from 'react';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { Field, Select } from '@grafana/ui';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, ClusterOption } from 'types';
import { selectors } from 'test/selectors';
import { ConfigSection } from '@grafana/experimental';
import { parseClustersResponse } from 'response_parser';
import { BackendSrvRequest, getBackendSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';
import { AzureClientSecretCredentials } from './AzureCredentials';

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
      getClusters(props.options.jsonData.azureCredentials as AzureClientSecretCredentials).then((result) => {
        if (!canceled) {
          setClusters(result);
        }
      });
      return () => {
        canceled = true;
      };
    };
    gettingClusters().catch(console.error);
  }, [options.jsonData, options.uid, props.options.jsonData.azureCredentials])

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

const getToken = async (creds: AzureClientSecretCredentials) => {
  const request = {
    url: `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/authorize`,
    responseType: "json",
    method: 'POST',
    data: {
    "grant_type": "client_credentials",
    "client_id": creds.clientId,
    "client_secret": creds.clientSecret,
    "resource": "https://management.azure.com/"
    },
  } as BackendSrvRequest;
  try {
    const res = await lastValueFrom(
      getBackendSrv().fetch<any>(request)
    );
    const clusters = res.data;
    return clusters;
  } catch (err) {
    return Promise.resolve([]);
  }
}

const getClusters = async (creds: AzureClientSecretCredentials) => {
  const f = await getToken(creds);
  console.log(f);
  // const request = {
  //   url: `https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01`,
  //   method: 'POST',
  //   headers: {
  //     "dsaf": "dsf"
  //   },
  //   data: {
  //     "subscriptions": [
  //         //`${}`
  //     ],
  //     "query": `resources | where type == "microsoft.kusto/clusters"`
  //   }
  // } as BackendSrvRequest;
  // try {
  //   const res = await lastValueFrom(
  //     getBackendSrv().fetch<ClusterOption[]>(request)
  //   );
  //   const clusters = res.data;
  //   return parseClustersResponse(clusters, false);
  // } catch (err) {
  //   return Promise.resolve([]);
  // }
};

export default ConnectionConfig;
