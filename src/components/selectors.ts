import { E2ESelectors } from '@grafana/e2e-selectors';

export const Components = {
  ConfigEditor: {
    ConnectionConfig: {
      clusterUrl: 'cluster url',
      tenantId: 'tenant id',
      clientId: 'client id',
      clientSecret: 'client secret',
    },
  },
};

export const selectors: { components: E2ESelectors<typeof Components> } = {
  components: Components,
};
