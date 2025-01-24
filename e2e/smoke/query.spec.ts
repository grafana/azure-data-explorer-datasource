import { expect, test } from '@grafana/plugin-e2e';
import { selectors } from '../../src/test/selectors';
import { isVersionGtOrEq } from '../../src/version';

test.describe('Azure Data Explorer queries - smoke', () => {
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
    if (versionValue) {
      await expect(
        panelEditPage.getQueryEditorRow('A').getByTestId(selectors.components.queryEditor.database.input.selector)
      ).toBeVisible();
    } else {
      // data-testid was not passed to the select component prior to 11.1.0
      await expect(panelEditPage.getQueryEditorRow('A').getByText('Database')).toBeVisible();
    }

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
      // data-testid was not passed to the select component prior to 11.1.0
      await expect(panelEditPage.getQueryEditorRow('A').getByText('Cluster')).toBeVisible();
    }
    if (versionValue) {
      await expect(
        panelEditPage.getQueryEditorRow('A').getByTestId(selectors.components.queryEditor.database.input.selector)
      ).toBeVisible();
    } else {
      // data-testid was not passed to the select component prior to 11.1.0
      await expect(panelEditPage.getQueryEditorRow('A').getByText('Database')).toBeVisible();
    }

    await expect(page.getByTestId(selectors.components.queryEditor.tableFrom.input)).toBeVisible();
    await expect(page.getByTestId(selectors.components.queryEditor.columns.input)).toBeVisible();
    await expect(page.getByTestId(selectors.components.queryEditor.filters.field)).toBeVisible();
    await expect(page.getByTestId(selectors.components.queryEditor.aggregate.field)).toBeVisible();
    await expect(page.getByTestId(selectors.components.queryEditor.groupBy.field)).toBeVisible();
    await expect(page.getByTestId(selectors.components.queryEditor.timeshift.field)).toBeVisible();
    await expect(page.getByTestId(selectors.components.queryEditor.queryPreview.field)).toBeVisible();
    await page.getByTestId(selectors.components.queryEditor.runQuery.button).click();
  });
});
