/*
  NOTE: this file can be moved into @grafana/e2e, however I wanted to keep it here for now 
  so that we could look at all relevant files in 1 PR.
*/
import { e2e } from '@grafana/e2e';
import { v4 as uuidv4 } from 'uuid';

/**
* smokeTestDatasource: tests login, configuring the datasource, 
* uploading a dashboard to consume that datasource, 
* and verifying that the first panel in that dashboard is querying data and formatting it properly
* @param datasourcetype string representing the type of datasource
* @param setFormData a callback function which can be used to set configuration keys for a datasource on the config page
* @param sampleDashboard a json object used to import an existing dashboard
* @param expectData a json object that is used to verify that our formated data is coming back as expected
*/
export const smokeTestDatasource = (
  datasourceType: string,
  setFormData: () => void,
  sampleDashboard: { [key: string]: any },
  expectedData: { [key: string]: any }
) => {
  const dashboardName = `e2e-dashboard-name-for-${datasourceType}-${uuidv4()}`;
  // Step 1: Create the datasource
  return e2e.flows
    .addDataSource({
      checkHealth: false,
      expectedAlertMessage: 'Success',
      form: setFormData,
      type: datasourceType,
    })
    .then(() => {
      // Step 2: Import a dashboard with a json object from our plugin provisioning
      // TODO: why doesn't this work: e2e().visit('/dashboard/import');
      e2e().visit('localhost:3000/dashboard/import');

      // TODO: add selectors for this inside main grafana repo and then use that
      // Note: normally we'd use 'click' and then 'type' here, but the json object is so big that using 'val' is much faster
      e2e().get('[name=dashboardJson]').invoke('val', JSON.stringify(sampleDashboard)).click({ force: true });
      e2e().get('legend').contains('Import via panel json').parent().find('button').click({ force: true });
      e2e().get('[name=title]').click({ force: true }).clear().type(dashboardName);
      e2e().get('[type=submit]').click({ force: true });

      // Step 3: Find a panel on the dashboard and then
      // click inspect -> json -> panel data
      e2e().get('.panel-title').first().click({ force: true }); // TODO: use a selector
      e2e.components.Panels.Panel.headerItems('Inspect').click({ force: true });
      e2e.components.Tab.title('JSON').click({ force: true });
      e2e().wait(3000);
      e2e.components.PanelInspector.Json.content().contains('Panel JSON').click({ force: true });
      e2e().wait(3000);
      e2e.components.PanelInspector.Json.content().contains('Data').click({ force: true });
      e2e().wait(3000);

      // Step 4: grab the json object from the editor and ensure it matches what we expect
      return e2e()
        .window()
        .then((win: any) => {
          const formattedData = JSON.parse(win.monaco.editor.getModels()[0].getValue());

          // we remove `request` and `timings` because they contain either time-based or
          // otherwise non-deterministic info that changes too frequently to test effectively
          delete formattedData.request;
          delete expectedData.request;

          delete formattedData.timings;
          delete expectedData.timings;

          return expect(formattedData).deep.equal(expectedData);
        });
    })
};
