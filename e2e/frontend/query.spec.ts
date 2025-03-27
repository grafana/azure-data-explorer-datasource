import { expect, test } from '@grafana/plugin-e2e';
import { selectors } from '../../src/test/selectors';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from '../../src/types';
import { isVersionGtOrEq } from '../../src/version';

test.describe('Azure Data Explorer queries', () => {
  test('Create a KQL query', async ({ dashboardPage, page, readProvisionedDataSource, grafanaVersion }) => {
    const datasource = await readProvisionedDataSource<AdxDataSourceOptions, AdxDataSourceSecureOptions>({
      fileName: 'adx.yaml',
      name: 'Azure Data Explorer',
    });
    const panel = await dashboardPage.addPanel();
    await panel.datasource.set(datasource.name);
    await panel.setVisualization('Table');

    const versionValue = isVersionGtOrEq(grafanaVersion, '11.1.0');

    if (versionValue) {
      await panel
        .getQueryEditorRow('A')
        .getByTestId(selectors.components.queryEditor.cluster.input.selector)
        .click({ force: true });
    } else {
      // data-testid was not passed to the select component prior to 11.1.0
      await panel.getQueryEditorRow('A').getByText('Cluster').click({ force: true });
    }
    await page.getByLabel('Select options menu').getByText('adxtestclustere2e').click({ force: true });
    if (versionValue) {
      await panel
        .getQueryEditorRow('A')
        .getByTestId(selectors.components.queryEditor.database.input.selector)
        .click({ force: true });
    } else {
      // data-testid was not passed to the select component prior to 11.1.0
      await panel.getQueryEditorRow('A').getByText('Database').click({ force: true });
    }
    await page.getByLabel('Select options menu').getByText('adx-test-db').click({ force: true });
    await page.getByText('KQL').click({ force: true });
    await page.waitForTimeout(10000);
    await page.getByTestId(selectors.components.queryEditor.codeEditor.container).click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('adxe2etest | where $__');
    await page.waitForTimeout(10000);
    await page.keyboard.press('Control+Space');
    await expect(page.getByText('$__timeFilter')).toBeVisible();
    await page.keyboard.insertText('timeFilter(timestamp) | order by timestamp asc');
    await page.getByTestId(selectors.components.queryEditor.runQuery.button).click();
    await page.waitForTimeout(6000);
    expect(panel.panel.fieldNames).toContainText(['timestamp', 'name', 'index', 'jsonData', 'array', 'static']);
  });

  test('Create a KQL query and run using Shift+Enter', async ({
    dashboardPage,
    page,
    readProvisionedDataSource,
    grafanaVersion,
  }) => {
    const datasource = await readProvisionedDataSource<AdxDataSourceOptions, AdxDataSourceSecureOptions>({
      fileName: 'adx.yaml',
      name: 'Azure Data Explorer',
    });
    const panel = await dashboardPage.addPanel();
    await panel.datasource.set(datasource.name);
    await panel.setVisualization('Table');

    const versionValue = isVersionGtOrEq(grafanaVersion, '11.1.0');

    if (versionValue) {
      await panel
        .getQueryEditorRow('A')
        .getByTestId(selectors.components.queryEditor.cluster.input.selector)
        .click({ force: true });
    } else {
      // data-testid was not passed to the select component prior to 11.1.0
      await panel.getQueryEditorRow('A').getByText('Cluster').click({ force: true });
    }
    await page.getByLabel('Select options menu').getByText('adxtestclustere2e').click({ force: true });
    if (versionValue) {
      await panel
        .getQueryEditorRow('A')
        .getByTestId(selectors.components.queryEditor.database.input.selector)
        .click({ force: true });
    } else {
      // data-testid was not passed to the select component prior to 11.1.0
      await panel.getQueryEditorRow('A').getByText('Database').click({ force: true });
    }
    await page.getByLabel('Select options menu').getByText('adx-test-db').click({ force: true });
    await page.getByText('KQL').click({ force: true });
    await page.waitForTimeout(10000);
    await page.getByTestId(selectors.components.queryEditor.codeEditor.container).click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('adxe2etest | where $__');
    await page.waitForTimeout(10000);
    await page.keyboard.press('Control+Space');
    await expect(page.getByText('$__timeFilter')).toBeVisible();
    await page.keyboard.insertText('timeFilter(timestamp) | order by timestamp asc');
    await page.keyboard.press('Shift+Enter');
    await page.waitForTimeout(6000);
    expect(panel.panel.fieldNames).toContainText(['timestamp', 'name', 'index', 'jsonData', 'array', 'static']);
  });

  test('Create a builder query', async ({ dashboardPage, page, readProvisionedDataSource, grafanaVersion }) => {
    const datasource = await readProvisionedDataSource<AdxDataSourceOptions, AdxDataSourceSecureOptions>({
      fileName: 'adx.yaml',
    });
    const panel = await dashboardPage.addPanel();
    await panel.datasource.set(datasource.name);
    await panel.setVisualization('Table');

    const versionValue = isVersionGtOrEq(grafanaVersion, '11.1.0');

    if (versionValue) {
      await panel
        .getQueryEditorRow('A')
        .getByTestId(selectors.components.queryEditor.cluster.input.selector)
        .click({ force: true });
    } else {
      // data-testid was not passed to the select component prior to 11.1.0
      await panel.getQueryEditorRow('A').getByText('Cluster').click({ force: true });
    }
    await page.getByLabel('Select options menu').getByText('adxtestclustere2e').click({ force: true });
    if (versionValue) {
      await panel
        .getQueryEditorRow('A')
        .getByTestId(selectors.components.queryEditor.database.input.selector)
        .click({ force: true });
    } else {
      // data-testid was not passed to the select component prior to 11.1.0
      await panel.getQueryEditorRow('A').getByText('Database').click({ force: true });
    }
    await page.getByLabel('Select options menu').getByText('adx-test-db').click({ force: true });
    await page
      .getByTestId(selectors.components.queryEditor.tableFrom.input)
      .getByLabel('Table', { exact: true })
      .click({ force: true });
    await page.getByLabel('Select options menu').getByText('adxe2etest').click({ force: true });
    await page.waitForTimeout(6000);

    await page.getByTestId(selectors.components.queryEditor.runQuery.button).click();
    await page.waitForTimeout(6000);
    expect(panel.panel.fieldNames).toContainText(['timestamp', 'name', 'index', 'jsonData', 'array', 'static']);
  });
});
