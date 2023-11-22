// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

// Jest configuration provided by Grafana scaffolding
const createPluginConfig = require('./.config/jest.config');

module.exports = {
  ...createPluginConfig,
  moduleNameMapper: {
    ...createPluginConfig.moduleNameMapper,
    '@kusto/monaco-kusto': '<rootDir>/src/test/mocks/monaco-kusto.ts',
  },
};
