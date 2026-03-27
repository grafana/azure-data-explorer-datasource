// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const { grafanaESModules, nodeModulesToTransform } = require('./.config/jest/utils');

// Jest configuration provided by Grafana scaffolding
module.exports = {
  ...require('./.config/jest.config'),
  // @grafana/llm v1+ pulls in @modelcontextprotocol/sdk and pkce-challenge which ship
  // ESM-only browser builds. Force Node.js export conditions so the CJS builds are used.
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
  transformIgnorePatterns: [nodeModulesToTransform([...grafanaESModules, '@modelcontextprotocol'])],
};
