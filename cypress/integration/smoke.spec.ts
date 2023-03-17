import { e2e } from '@grafana/e2e';
import { v4 as uuidv4 } from 'uuid';

import { selectors } from '../../src/test/selectors';
import { AdxQueryType } from '../../src/types';

import TEST_DASHBOARD from '../dashboards/example.json';

const e2eSelectors = e2e.getSelectors(selectors.components);
const dataSourceName = `Azure Data Explorer E2E Tests - ${uuidv4()}`;

for (const panel of TEST_DASHBOARD.panels) {
  panel.datasource = dataSourceName;
}

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

const addAdxVariable = (
  name: string,
  type: AdxQueryType,
  isFirst: boolean,
  options?: { database?: string; table?: string }
) => {
  e2e.components.PageToolbar.item('Dashboard settings').click();
  e2e.components.Tab.title('Variables').click();
  if (isFirst) {
    e2e.pages.Dashboard.Settings.Variables.List.addVariableCTAV2().click();
  } else {
    e2e.pages.Dashboard.Settings.Variables.List.newButton().click();
  }
  e2e.pages.Dashboard.Settings.Variables.Edit.General.generalNameInputV2().clear().type(name);
  e2e.components.DataSourcePicker.inputV2().type(`${dataSourceName}{enter}`);
  e2eSelectors.variableEditor.queryType.input().find('input').type(`${type}{enter}`);
  switch (type) {
    case AdxQueryType.Tables:
      e2eSelectors.variableEditor.databases.input().find('input').type(`${options?.database}{enter}`);
      break;
    case AdxQueryType.Columns:
      e2eSelectors.variableEditor.databases.input().find('input').type(`${options?.database}{enter}`);
      e2eSelectors.variableEditor.tables.input().find('input').type(`${options?.table}{enter}`);
      break;
  }
  e2e.pages.Dashboard.Settings.Variables.Edit.General.submitButton().click();
  e2e.components.PageToolbar.item('Go Back').click();
};

e2e.scenario({
  describeName: 'Add Azure Data Explorer datasource',
  itName: 'fills out datasource connection configuration',
  scenario: () => {
    e2e()
      .readProvisions(['datasources/adx.yaml'])
      .then((ADXProvisions: ADXProvision[]) => {
        const datasource = ADXProvisions[0].datasources[0];
        e2e.flows.addDataSource({
          type: 'Azure Data Explorer Datasource',
          form: () => {
            e2eSelectors.configEditor.azureCloud.input().find('input').type('Azure');
            e2eSelectors.configEditor.clusterURL.input().click({ force: true }).type(datasource.jsonData.clusterUrl);
            e2eSelectors.configEditor.tenantID.input().type(datasource.jsonData.tenantId);
            e2eSelectors.configEditor.clientID.input().type(datasource.jsonData.clientId);
            e2eSelectors.configEditor.clientSecret.input().type(datasource.secureJsonData.clientSecret);
          },
          expectedAlertMessage: 'Success',
          name: dataSourceName,
        });
        e2e.setScenarioContext({ addedDataSources: [] });
      });
  },
});

e2e.scenario({
  describeName: 'Add ADX datasource Import Dashoard',
  itName: 'imports JSON dashboard',
  scenario: () => e2e.flows.importDashboard(TEST_DASHBOARD, undefined, true),
});

e2e.scenario({
  describeName: 'Creates Panel run KQL query',
  itName: 'adds panel and runs query',
  scenario: () => {
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
      dataSourceName: '', // avoid issue selecting the data source before the editor is fully loaded
      queriesForm: () => {
        e2e.components.DataSourcePicker.inputV2().click().type(`${dataSourceName}{enter}`).wait(6000);
        e2eSelectors.queryEditor.database.input().click({ force: true });
        cy.contains('PerfTest').click({ force: true });
        cy.contains('KQL').click({ force: true }).wait(6000);
        e2eSelectors.queryEditor.codeEditor
          .container()
          .click({ force: true })
          .type('{selectall}{del}')
          .type('PerfTest | where ');
        // It should trigger auto-completion suggestions
        cy.contains('$__timeFilter');
        // complete the query
        e2eSelectors.queryEditor.codeEditor
          .container()
          .click({ force: true })
          .type('$__timeFilter(_Timestamp_) | order by _Timestamp_ asc');
        e2eSelectors.queryEditor.runQuery.button().click({ force: true }).wait(6000);
        cy.contains('_val1_');
      },
    });
  },
});

e2e.scenario({
  describeName: 'Creates Panel run query via builder',
  itName: 'adds panel and runs query via builder',
  scenario: () => {
    e2e.flows.addDashboard({
      timeRange: {
        from: '2017-09-22 12:00:00',
        to: '2017-09-23 12:00:00',
      },
      variables: [],
    });

    e2e.flows.addPanel({
      matchScreenshot: false,
      visitDashboardAtStart: false,
      dataSourceName: '',
      queriesForm: () => {
        e2e.components.DataSourcePicker.inputV2().click().type(`${dataSourceName}{enter}`).wait(6000);
        e2eSelectors.queryEditor.database.input().click({ force: true });
        cy.contains('PerfTest').click({ force: true });

        e2eSelectors.queryEditor.tableFrom.input().click({ force: true });
        cy.contains('PerfTest').click({ force: true });

        e2eSelectors.queryEditor.runQuery.button().click({ force: true }).wait(6000);
        cy.contains('_val1_').should('exist');
      },
    });
  },
});

e2e.scenario({
  describeName: 'Create dashboard with template variables',
  itName: 'creates a dashboard that includes template variables',
  scenario: () => {
    e2e.flows.addDashboard({
      timeRange: {
        from: 'now-6h',
        to: 'now',
        zone: 'Coordinated Universal Time',
      },
    });
    addAdxVariable('database', AdxQueryType.Databases, true);
    addAdxVariable('table', AdxQueryType.Tables, false, {
      database: '$database',
    });
    addAdxVariable('column', AdxQueryType.Columns, false, {
      database: '$database',
      table: '$table',
    });
    e2e.pages.Dashboard.SubMenu.submenuItemLabels('database').click();
    e2e.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts('PerfTest').click();
    e2e.pages.Dashboard.SubMenu.submenuItemLabels('table').click();
    e2e.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts('PerfTest').click();
    e2e.pages.Dashboard.SubMenu.submenuItemLabels('column').click();
    e2e.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts('_val1_').click();

    e2e.flows.addPanel({
      matchScreenshot: false,
      visitDashboardAtStart: false,
      dataSourceName, // avoid issue selecting the data source before the editor is fully loaded
      queriesForm: () => {
        e2eSelectors.queryEditor.database.input().type('$database{enter}');
        e2eSelectors.queryEditor.tableFrom.input().type('$table{enter}');
        e2eSelectors.queryEditor.columns.input().type('$column{enter}');

        e2eSelectors.queryEditor.runQuery.button().click({ force: true });
        cy.contains('_val1_').should('exist');
      },
    });
  },
});

e2e.scenario({
  describeName: 'Remove datasource',
  itName: 'remove azure data explorer datasource',
  scenario: () => {
    e2e.flows.deleteDataSource({ name: dataSourceName, id: '', quick: true });
  },
});
