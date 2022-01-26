import { e2e } from '@grafana/e2e';
import { selectors } from '../../src/test/selectors';

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

e2e.scenario({
  describeName: 'Smoke tests',
  itName: 'Adds ADX datasource',
  scenario: () => {
    e2e()
      .readProvisions(['datasources/adx.yaml'])
      .then((ADXProvisions: ADXProvision[]) => {
        const datasource = ADXProvisions[0].datasources[1]; // Second entry in our common provisioning file

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
      });
  },
});
