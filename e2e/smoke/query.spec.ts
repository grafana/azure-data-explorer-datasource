import { expect, test } from '@grafana/plugin-e2e';
import { selectors } from '../../src/test/selectors';
import { isVersionGtOrEq } from '../../src/version';

test.describe('Azure Data Explorer queries', () => {
  test('renders KQL editor', async ({ panelEditPage, page, grafanaVersion }) => {
    await panelEditPage.datasource.set('Azure Data Explorer');

    const versionValue = isVersionGtOrEq(grafanaVersion, '11.1.0');

    if (versionValue) {
      await expect(
        panelEditPage.getQueryEditorRow('A').getByTestId(selectors.components.queryEditor.cluster.input.selector)
      ).toBeVisible();
    } else {
      // data-testid was not passed to the select component prior to 11.1.0
      await expect(panelEditPage.getQueryEditorRow('A').getByText('Cluster')).toBeVisible();
    }
    await expect(
      panelEditPage.getQueryEditorRow('A').getByTestId(selectors.components.queryEditor.database.input.selector)
    ).toBeVisible();
    await expect(
      panelEditPage.getQueryEditorRow('A').getByTestId(selectors.components.queryEditor.database.input.selector)
    ).toBeVisible();
    await page.getByText('KQL').click({ force: true });
    await expect(
      panelEditPage.getQueryEditorRow('A').getByTestId(selectors.components.queryEditor.codeEditor.container)
    ).toBeVisible();
  });

  test('renders builder', async ({ panelEditPage, page, grafanaVersion }) => {
    await panelEditPage.datasource.set('Azure Data Explorer');

    const versionValue = isVersionGtOrEq(grafanaVersion, '11.1.0');

    if (versionValue) {
      await expect(
        panelEditPage.getQueryEditorRow('A').getByTestId(selectors.components.queryEditor.cluster.input.selector)
      ).toBeVisible();
    } else {
      await expect(panelEditPage.getQueryEditorRow('A').getByText('Cluster')).toBeVisible();
    }
    await expect(
      panelEditPage.getQueryEditorRow('A').getByTestId(selectors.components.queryEditor.database.input.selector)
    ).toBeVisible();
    await expect(
      panelEditPage.getQueryEditorRow('A').getByTestId(selectors.components.queryEditor.database.input.selector)
    ).toBeVisible();
    await expect(page.getByTestId(selectors.components.queryEditor.tableFrom.input)).toBeVisible();
    await expect(page.getByTestId(selectors.components.queryEditor.columns.input)).toBeVisible();
    await expect(page.getByLabel('Filters')).toBeVisible();
    await expect(page.getByLabel('Aggregate')).toBeVisible();
    await expect(page.getByLabel('Group by')).toBeVisible();
    await expect(page.getByLabel('Timeshift')).toBeVisible();
    await expect(page.getByLabel('Query Preview')).toBeVisible();
    await page.getByTestId(selectors.components.queryEditor.runQuery.button).click();
  });
});
