// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

// Jest configuration provided by Grafana scaffolding
module.exports = {
  ...require('./.config/jest.config'),
};
