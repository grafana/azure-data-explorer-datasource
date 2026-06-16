import { expect, PluginTestCtx, test, VariablePage } from '@grafana/plugin-e2e';
import { Page } from '@playwright/test';
import { selectors } from '../../src/test/selectors';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, AdxQueryType } from '../../src/types';

const addAdxVariable = async (
  context: PluginTestCtx,
  variablePage: VariablePage,
  page: Page,
  name: string,
  ds: string,
  isFirst: boolean,
  options: { queryType: AdxQueryType; cluster?: string; database?: string; table?: string }
) => {
  const { queryType, cluster, database, table } = options;
  const variableEditPage = await variablePage.clickAddNew();

  await variableEditPage.setVariableType('Query');
  await variableEditPage.datasource.set(ds);
  await variableEditPage
    .getByGrafanaSelector(context.selectors.pages.Dashboard.Settings.Variables.Edit.General.generalNameInputV2)
    .fill(name);

  await page
    .getByTestId(selectors.components.variableEditor.queryType.input)
    .getByRole('combobox')
    .fill(`${queryType}`);
  await page.keyboard.press('Enter');
  switch (queryType) {
    case AdxQueryType.Databases:
      await page
        .getByTestId(selectors.components.variableEditor.clusters.input)
        .getByRole('combobox')
        .fill(cluster || '');
      await page.keyboard.press('Enter');
      break;
    case AdxQueryType.Tables:
      await page
        .getByTestId(selectors.components.variableEditor.clusters.input)
        .getByRole('combobox')
        .fill(cluster || '');
      await page.keyboard.press('Enter');
      await page
        .getByTestId(selectors.components.variableEditor.databases.input)
        .getByRole('combobox')
        .fill(database || '');
      await page.keyboard.press('Enter');
      break;
    case AdxQueryType.Columns:
      await page
        .getByTestId(selectors.components.variableEditor.clusters.input)
        .getByRole('combobox')
        .fill(cluster || '');
      await page.keyboard.press('Enter');
      await page
        .getByTestId(selectors.components.variableEditor.databases.input)
        .getByRole('combobox')
        .fill(database || '');
      await page.keyboard.press('Enter');
      await page
        .getByTestId(selectors.components.variableEditor.tables.input)
        .getByRole('combobox')
        .fill(table || '');
      await page.keyboard.press('Enter');
      break;
  }
  await variablePage
    .getByGrafanaSelector(context.selectors.pages.Dashboard.Settings.Variables.Edit.General.submitButton)
    .click();

  await variablePage
    .getByGrafanaSelector(context.selectors.pages.Dashboard.Settings.Variables.Edit.General.applyButton)
    .click();
};

test.skip('Template variables', () => {
  test('creates a dashboard that includes template variables', async ({
    dashboardPage: newDashboardPage,
    page,
    readProvisionedDataSource,
    gotoVariablePage,
    gotoDashboardPage,
  }) => {
    const datasource = await readProvisionedDataSource<AdxDataSourceOptions, AdxDataSourceSecureOptions>({
      fileName: 'adx.yaml',
    });
    const context = newDashboardPage.ctx;
    const dashboardUid = await newDashboardPage.saveDashboard(`Template variables test - ${datasource.name}`);

    if (!dashboardUid) {
      throw new Error('Dashboard saving failed, UID unavailable');
    }
    const dashboardPage = await gotoDashboardPage({ uid: dashboardUid });
    console.log({ uid: dashboardPage.dashboard?.uid });

    const variablePage = await gotoVariablePage({ uid: dashboardUid });

    await addAdxVariable(context, variablePage, page, 'cluster', datasource.name, true, {
      queryType: AdxQueryType.Clusters,
    });
    await addAdxVariable(context, variablePage, page, 'database', datasource.name, false, {
      queryType: AdxQueryType.Databases,
      cluster: '$cluster',
    });
    await addAdxVariable(context, variablePage, page, 'table', datasource.name, false, {
      queryType: AdxQueryType.Tables,
      cluster: '$cluster',
      database: '$database',
    });
    await addAdxVariable(context, variablePage, page, 'column', datasource.name, false, {
      queryType: AdxQueryType.Columns,
      cluster: '$cluster',
      database: '$database',
      table: '$table',
    });

    await dashboardPage.getByGrafanaSelector(context.selectors.pages.Dashboard.Settings.Actions.close).click();

    await dashboardPage
      .getByGrafanaSelector(context.selectors.pages.Dashboard.SubMenu.submenuItemLabels('cluster'))
      .click();
    await dashboardPage
      .getByGrafanaSelector(
        context.selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts('adxtestclustere2e')
      )
      .click();
    await dashboardPage
      .getByGrafanaSelector(context.selectors.pages.Dashboard.SubMenu.submenuItemLabels('database'))
      .click();
    await dashboardPage
      .getByGrafanaSelector(
        context.selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts('adx-test-db')
      )
      .click();
    await dashboardPage
      .getByGrafanaSelector(context.selectors.pages.Dashboard.SubMenu.submenuItemLabels('table'))
      .click();
    await dashboardPage
      .getByGrafanaSelector(context.selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts('adxe2etest'))
      .click();
    await dashboardPage
      .getByGrafanaSelector(context.selectors.pages.Dashboard.SubMenu.submenuItemLabels('column'))
      .click();
    await dashboardPage
      .getByGrafanaSelector(context.selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts('static'))
      .click();

    const panel = await dashboardPage.addPanel();
    await panel.datasource.set(datasource.name);
    await panel.setVisualization('Table');

    await page.getByTestId(selectors.components.queryEditor.cluster.input.selector).click({ force: true });
    await page.getByLabel('Select options menu').getByText('$cluster').click({ force: true });
    await page.getByTestId(selectors.components.queryEditor.database.input.selector).click({ force: true });
    await page.getByLabel('Select options menu').getByText('$database').click({ force: true });
    await page.getByTestId(selectors.components.queryEditor.tableFrom.input).getByText('$table');
    await page.getByTestId(selectors.components.queryEditor.columns.input).getByText('$column');
    await page
      .getByTestId(selectors.components.queryEditor.tableFrom.input)
      .getByLabel('Table', { exact: true })
      .click({ force: true });
    await page.getByLabel('Select options menu').getByText('$table').click({ force: true });
    await page.getByTestId(selectors.components.queryEditor.runQuery.button).click();
    await page.waitForTimeout(6000);
    expect(panel.panel.fieldNames).toContainText(['timestamp', 'name', 'index', 'jsonData', 'array', 'static']);

    // Delete dashboard for clean-up
    await dashboardPage.deleteDashboard();
  });
});
