import {e2e} from "@grafana/e2e";
import {selectors} from '../../src/test/selectors';

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
                const datasource = ADXProvisions[0].datasources[0];

                e2e.flows.addDataSource({
                    name: 'e2e-azure-data-explorer-datasource',
                    type:'Azure Data Explorer Datasource',
                    form: () => {
                        e2eSelectors.ConfigEditor.AzureCloud().type('Azure')
                        e2e().get('[data-testid="cluster-url"]')
                            .click({force: true})
                            .type(datasource.jsonData.clusterUrl)
                        e2e().get('[data-testid="tenant-id"]').type(datasource.jsonData.tenantId)
                        e2e().get('[data-testid="client-id"]').type(datasource.jsonData.clientId)
                        e2eSelectors.ConfigEditor.ClientSecret().type(datasource.secureJsonData.clientSecret)
                    },
                    expectedAlertMessage: 'Success'
                })
            });
    }
});

