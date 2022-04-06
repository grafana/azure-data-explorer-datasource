import { E2ESelectors } from '@grafana/e2e-selectors';

export const components = {
  configEditor: {
    azureCloud: {
      input: 'data-testid azure-cloud',
    },
    tenantID: {
      input: 'data-testid tenant-id',
    },
    clusterURL: {
      input: 'data-testid cluster-url',
    },
    clientID: {
      input: 'data-testid client-id',
    },
    clientSecret: {
      input: 'data-testid client-secret',
    },
  },
  queryEditor: {
    editKQL: {
      button: 'Edit KQL',
    },
    codeEditor: {
      container: 'data-testid legacy-editor',
    },
    database: {
      input: 'Database',
    },
    runQuery: {
      button: 'Run Query',
    },
  },
};

export const selectors: { components: E2ESelectors<typeof components> } = {
  components: components,
};
