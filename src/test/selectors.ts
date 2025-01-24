import { E2ESelectors } from '@grafana/e2e-selectors';

export const components = {
  applicationEditor: {
    application : {
      input: 'data-testid application'
    }
  },
  configEditor: {
    authType: {
      input: 'data-testid azure-auth',
    },
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
      openAI: 'data-testid open-ai-editor',
    },
    cluster: {
      input: {
        label: 'data-testid cluster',
        // Only required for tests due to the way the InlineSelect component works
        selector: 'data-testid cluster-input',
      },
    },
    database: {
      input: {
        label: 'data-testid database',
        // Only required for tests due to the way the InlineSelect component works
        selector: 'data-testid database-input',
      },
    },
    tableFrom: {
      input: 'data-testid table',
    },
    columns: {
      input: 'data-testid columns',
    },
    runQuery: {
      button: 'data-testid run-query',
    },
  },
  variableEditor: {
    queryType: {
      input: 'data-testid query-type',
    },
    clusters: {
      input: 'data-testid clusters',
    },
    databases: {
      input: 'data-testid databases',
    },
    tables: {
      input: 'data-testid tables',
    },
  },
};

export const selectors: { components: E2ESelectors<typeof components> } = {
  components: components,
};
