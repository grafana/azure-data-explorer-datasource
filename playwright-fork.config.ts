import type { PluginOptions } from '@grafana/plugin-e2e';
import { defineConfig } from '@playwright/test';
import { dirname } from 'path';
import playwrightConfig from './playwright.config';

const pluginE2eAuth = `${dirname(require.resolve('@grafana/plugin-e2e'))}/auth`;

export default defineConfig<PluginOptions>({
  ...playwrightConfig,
  testDir: './e2e/smoke',
});
