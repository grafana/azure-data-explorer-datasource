import type { PluginOptions } from '@grafana/plugin-e2e';
import { defineConfig } from '@playwright/test';
import playwrightConfig from './playwright.config';

export default defineConfig<PluginOptions>({
  ...playwrightConfig,
  testDir: './e2e/smoke',
});
