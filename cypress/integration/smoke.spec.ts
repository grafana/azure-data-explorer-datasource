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
  describeName: 'Add ADX datasource Import Dashoard',
  itName: 'fills out datasource connection configuration and imports JSON dashboard',
  scenario: () => {
    e2e()
      .readProvisions(['datasources/adx.yaml'])
      .then((ADXProvisions: ADXProvision[]) => {
        addCommonProvisioningADXDatasource(ADXProvisions);
        e2e.flows.importDashboard(TEST_DASHBOARD);
      });
  },
});

e2e.scenario({
  describeName: 'Creates Panel run KQL query',
  itName: 'fills out datasource connection configuration, adds panel and runs query',
  scenario: () => {
    e2e()
      .readProvisions(['datasources/adx.yaml'])
      .then((ADXProvisions: ADXProvision[]) => {
        addCommonProvisioningADXDatasource(ADXProvisions);

        e2e.flows.addDashboard({
          timeRange: {
            from: '2019-10-05 19:00:00',
            to: '2019-10-10 19:00:00',
          },
          variables: [],
        });

        e2e.flows.addPanel({
          matchScreenshot: false,
          visitDashboardAtStart: false,
          queriesForm: () => {
            e2eSelectors.queryEditor.database.input().click({ force: true });
            cy.contains('PerfTest').click({ force: true });
            e2eSelectors.queryEditor.editKQL.button().click({ force: true });
            e2eSelectors.queryEditor.codeEditorLegacy
              .textarea()
              .should('be.visible')
              .click({ force: true })
              .type('{del}'.repeat(100))
              .type(`PerfTest | where $__timeFilter(_Timestamp_) | order by _Timestamp_ asc`);
            e2eSelectors.queryEditor.runQuery.button().click({ force: true });
            cy.contains('Lonely period range deg');
          },
        });
      });
  },
});

e2e.scenario({
  describeName: 'Creates Panel run query via builder',
  itName: 'fills out datasource connection configuration, adds panel and runs query via builder',
  scenario: () => {
    e2e()
      .readProvisions(['datasources/adx.yaml'])
      .then((ADXProvisions: ADXProvision[]) => {
        addCommonProvisioningADXDatasource(ADXProvisions);

        e2e.flows.addDashboard({
          timeRange: {
            from: '2022-01-05 19:00:00',
            to: '2022-01-10 19:00:00',
          },
          variables: [],
        });

        e2e.flows.addPanel({
          matchScreenshot: false,
          visitDashboardAtStart: false,
          queriesForm: () => {
            e2eSelectors.queryEditor.database.input().click({ force: true });
            cy.contains('PerfTest').click({ force: true });

            e2eSelectors.queryEditor.tableFrom.input().click({ force: true });
            cy.contains('events.all').click({ force: true });

            e2eSelectors.queryEditor.runQuery.button().click({ force: true });
            cy.contains('No graphable fields').should('exist');
          },
        });
      });
  },
});
