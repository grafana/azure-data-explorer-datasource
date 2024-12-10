import { expect, test } from '@grafana/plugin-e2e';
import { selectors } from '../../src/test/selectors';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from '../../src/types';

test.describe('Azure Data Explorer queries', () => {
  test('Create a KQL query', async ({ dashboardPage, page, readProvisionedDataSource }) => {
    const datasource = await readProvisionedDataSource<AdxDataSourceOptions, AdxDataSourceSecureOptions>({
      fileName: 'adx.yaml',
    });
    const panel = await dashboardPage.addPanel();
    await dashboardPage.timeRange.set({
      from: '2019-10-05 19:00:00',
      to: '2019-10-10 19:00:00',
    });
    await panel.datasource.set(datasource.name);
    await panel.setVisualization('Table');

    await page.getByTestId(selectors.components.queryEditor.cluster.input.selector).click({ force: true });
    await page.getByLabel('Select options menu').getByText('grafanaadxdev').click({ force: true });
    await page.getByTestId(selectors.components.queryEditor.database.input.selector).click({ force: true });
    await page.getByLabel('Select options menu').getByText('PerfTest').click({ force: true });
    await page.getByText('KQL').click({ force: true });
    await page.waitForTimeout(10000);
    await page.getByTestId(selectors.components.queryEditor.codeEditor.container).click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('PerfTest | where $__');
    await page.waitForTimeout(10000);
    await page.keyboard.press('Control+Space');
    await expect(page.getByText('$__timeFilter')).toBeVisible();
    await page.keyboard.insertText('timeFilter(_Timestamp_) | order by _Timestamp_ asc');
    await page.getByTestId(selectors.components.queryEditor.runQuery.button).click();
    await page.waitForTimeout(6000);
    expect(panel.panel.fieldNames).toContainText(['_val1_', '_val2_']);
  });

  test('Create a builder query', async ({ dashboardPage, page, readProvisionedDataSource }) => {
    const datasource = await readProvisionedDataSource<AdxDataSourceOptions, AdxDataSourceSecureOptions>({
      fileName: 'adx.yaml',
    });
    const panel = await dashboardPage.addPanel();
    await dashboardPage.timeRange.set({
      from: '2017-09-22 12:00:00',
      to: '2017-09-23 12:00:00',
    });
    await panel.datasource.set(datasource.name);
    await panel.setVisualization('Table');

    await page.getByTestId(selectors.components.queryEditor.cluster.input.selector).click({ force: true });
    await page.getByLabel('Select options menu').getByText('grafanaadxdev').click({ force: true });
    await page.getByTestId(selectors.components.queryEditor.database.input.selector).click({ force: true });
    await page.getByLabel('Select options menu').getByText('PerfTest').click({ force: true });
    await page
      .getByTestId(selectors.components.queryEditor.tableFrom.input)
      .getByLabel('Table', { exact: true })
      .click({ force: true });
    await page.getByLabel('Select options menu').getByText('PerfTest').click({ force: true });

    await page.getByTestId(selectors.components.queryEditor.runQuery.button).click();
    await page.waitForTimeout(6000);
    expect(panel.panel.fieldNames).toContainText(['_val1_', '_val2_']);
  });
});
