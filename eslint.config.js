// @ts-check
const grafanaConfig = require('@grafana/eslint-config/flat');
const grafanaI18nPlugin = require('@grafana/i18n/eslint-plugin')

/**
 * @type {Array<import('eslint').Linter.Config>}
 */
module.exports = [
  {
    name: 'ignores',
    ignores: [
      'src/libs',
    ],
  },
  grafanaConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-deprecated': 'warn',
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json'
      }
    }
  },
  {
    files: ['./tests/**/*'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    // Sections of codebase that have all translation markup issues fixed
    name: 'grafana/i18n-overrides',
    plugins: {
      '@grafana/i18n': grafanaI18nPlugin,
    },
    files: [
      'src/**/*.{ts,tsx,js,jsx}',
    ],
    ignores: [
      'src/**/*.{test,spec,story}.{ts,tsx}',
    ],
    rules: {
      '@grafana/i18n/no-untranslated-strings': ['error', { calleesToIgnore: ['^css$', 'use[A-Z].*'] }],
      '@grafana/i18n/no-translation-top-level': 'error',
    },
  },
];
