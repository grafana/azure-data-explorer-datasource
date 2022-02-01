import { e2e } from '@grafana/e2e';
import { selectors } from '../../src/test/selectors';
import TEST_DASHBOARD from '../dashboards/example.json';

const e2eSelectors = e2e.getSelectors(selectors.components);

type ADXConfig = {
  secureJsonData: {
    clientSecret: string;
  };
  jsonData: {
    clusterUrl: string;
    tenantId: string;
    clientId: string;
  };
};

type ADXProvision = {
  datasources: ADXConfig[];
};

function addCommonProvisioningADXDatasource(ADXProvisions: ADXProvision[]) {
  const datasource = ADXProvisions[0].datasources[0];

  e2e.flows.addDataSource({
    name: 'e2e-azure-data-explorer-datasource',
    type: 'Azure Data Explorer Datasource',
    form: () => {
      e2eSelectors.configEditor.azureCloud.input().type('Azure');
      e2eSelectors.configEditor.clusterURL.input().click({ force: true }).type(datasource.jsonData.clusterUrl);
      e2eSelectors.configEditor.tenantID.input().type(datasource.jsonData.tenantId);
      e2eSelectors.configEditor.clientID.input().type(datasource.jsonData.clientId);
      e2eSelectors.configEditor.clientSecret.input().type(datasource.secureJsonData.clientSecret);
    },
    expectedAlertMessage: 'Success',
  });
}

e2e.scenario({
  describeName: 'Add ADX datasource',
  itName: 'fills out datasource connection configuration',
  scenario: () => {
    e2e()
      .readProvisions(['datasources/adx.yaml'])
      .then((ADXProvisions: ADXProvision[]) => {
        addCommonProvisioningADXDatasource(ADXProvisions);
      });
  },
});

e2e.scenario({
  describeName: 'Import dashboard',
  itName: 'adds JSON',
  scenario: () => {
    e2e()
      .readProvisions(['datasources/adx.yaml'])
      .then((ADXProvisions: ADXProvision[]) => {
        addCommonProvisioningADXDatasource(ADXProvisions);

        e2e.flows.importDashboard(TEST_DASHBOARD);
      });
  },
});
