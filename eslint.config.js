const grafanaI18nPlugin = require('@grafana/i18n/eslint-plugin');
const baseConfig = require('@grafana/eslint-config/flat');

module.exports = [{
    ...baseConfig,
    plugins: {
      '@grafana/i18n': grafanaI18nPlugin
    },
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@grafana/i18n/no-untranslated-strings": ["error", { "calleesToIgnore": ["^css$", "use[A-Z].*"] }],
      "@grafana/i18n/no-translation-top-level": "error"
    }
}]
