import {E2ESelectors} from '@grafana/e2e-selectors';

export const Components = {
    ConfigEditor: {
        AzureCloud: 'Azure cloud',
        ClientSecret: 'Client secret',
    },
};

export const selectors: { components: E2ESelectors<typeof Components> } = {
    components: Components,
};
