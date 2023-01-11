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
      button: 'KQL',
    },
    codeEditorLegacy: {
      container: 'data-testid legacy-editor',
      textarea: 'Editor content;Press Alt+F1 for Accessibility Options.',
    },
    codeEditor: {
      container: 'data-testid code-editor',
    },
    database: {
      input: 'Database',
    },
    tableFrom: {
      input: 'Table',
    },
    runQuery: {
      button: 'Run query',
    },
  },
};

export const selectors: { components: E2ESelectors<typeof components> } = {
  components: components,
};
