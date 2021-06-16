import { e2e } from '@grafana/e2e';
import { selectors } from '../../src/components/selectors';
import { smokeTestDatasource } from '../setup';
import expectedData from '../expectedData';
import dashboard from '../sampleDashboard';

const e2eSelectors = e2e.getSelectors(selectors.components);

e2e.scenario({
  describeName: `Smoke tests for ADX`,
  itName: 'Login, create data source, dashboard with variable and panel',
  scenario: () => {
    e2e()
      .readProvisions(['datasources/adx.yaml', 'dashboards/adx/stormevents.json']) 
      .then(([sampleDatasources, sampleDashboard]) => {
        // TODO: get datasource[0] working
        const datasourceJSON = sampleDatasources.datasources[1];

        // NOTE: temporarily overwriting the stormevents dashboard because
        // stormevents only works well with datasources[0], which is currently expired.
        sampleDashboard = dashboard;

        const setFormData = () => {
          e2eSelectors.ConfigEditor.ConnectionConfig.clusterUrl().type(datasourceJSON.jsonData.clusterUrl);
          e2eSelectors.ConfigEditor.ConnectionConfig.tenantId().type(datasourceJSON.jsonData.tenantId);
          e2eSelectors.ConfigEditor.ConnectionConfig.clientId().type(datasourceJSON.jsonData.clientId);
          e2eSelectors.ConfigEditor.ConnectionConfig.clientSecret().type(datasourceJSON.secureJsonData.clientSecret);
        };
        
        smokeTestDatasource('Azure Data Explorer Datasource', setFormData, sampleDashboard, expectedData);
      });
  },
});