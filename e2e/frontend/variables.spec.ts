import {
  DashboardEditViewArgs,
  DashboardPage,
  E2ESelectors,
  expect,
  PluginTestCtx,
  test,
  VariableEditPage,
} from '@grafana/plugin-e2e';
import { selectors } from '../../src/test/selectors';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions, AdxQueryType } from '../../src/types';
import { Page } from '@playwright/test';

const addAdxVariable = async (
  context: PluginTestCtx,
  dashboardPage: DashboardPage,
  page: Page,
  name: string,
  ds: string,
  type: AdxQueryType,
  index: string,
  options?: { cluster?: string; database?: string; table?: string }
) => {
  const variablePage = new VariableEditPage(context, { dashboard: dashboardPage.dashboard!, id: index });
  await variablePage.goto();
  const { addVariableCTAV2, addVariableCTAV2Item, newButton } =
    context.selectors.pages.Dashboard.Settings.Variables.List;

  if (!dashboardPage.dashboard?.uid) {
    await variablePage.getByGrafanaSelector(addVariableCTAV2(addVariableCTAV2Item)).click();
  } else {
    await variablePage.getByGrafanaSelector(newButton).click();
  }
  await variablePage.setVariableType('Query');
  await variablePage.datasource.set(ds);
  // await page.getByGrafanaSelector(selectors.pages.Dashboard.Settings.Variables.Edit.General.)
  //   e2e.pages.Dashboard.Settings.Variables.Edit.General.generalNameInputV2().clear().type(name);
  switch (type) {
    case AdxQueryType.Databases:
      await page.getByTestId(selectors.components.variableEditor.clusters.input).getByRole('combobox').click();
      await page.keyboard.insertText(`${options?.cluster}`);
      await page.keyboard.press('Enter');
      break;
    case AdxQueryType.Tables:
      await page.getByTestId(selectors.components.variableEditor.clusters.input).getByRole('combobox').click();
      await page.keyboard.insertText(`${options?.cluster}`);
      await page.keyboard.press('Enter');
      await page.getByTestId(selectors.components.variableEditor.databases.input).getByRole('combobox').click();
      await page.keyboard.insertText(`${options?.database}`);
      await page.keyboard.press('Enter');
      break;
    case AdxQueryType.Columns:
      await page.getByTestId(selectors.components.variableEditor.clusters.input).getByRole('combobox').click();
      await page.keyboard.insertText(`${options?.cluster}`);
      await page.keyboard.press('Enter');
      await page.getByTestId(selectors.components.variableEditor.databases.input).getByRole('combobox').click();
      await page.keyboard.insertText(`${options?.database}`);
      await page.keyboard.press('Enter');
      await page.getByTestId(selectors.components.variableEditor.tables.input).getByRole('combobox').click();
      await page.keyboard.insertText(`${options?.table}`);
      await page.keyboard.press('Enter');
      break;
  }
  await variablePage
    .getByGrafanaSelector(context.selectors.pages.Dashboard.Settings.Variables.Edit.General.submitButton)
    .click();
};

test.describe('Template variables', () => {
  test('creates a dashboard that includes template variables', async ({
    dashboardPage,
    page,
    readProvisionedDataSource,
    selectors,
  }) => {
    const datasource = await readProvisionedDataSource<AdxDataSourceOptions, AdxDataSourceSecureOptions>({
      fileName: 'adx.yaml',
    });
    const context = dashboardPage.ctx;
    await dashboardPage.goto()
    await dashboardPage.getByGrafanaSelector(selectors.pages.)

    // addAdxVariable(context, dashboardPage, page, 'cluster', datasource.name, AdxQueryType.Clusters, '0');
    addAdxVariable(context, dashboardPage, page, 'database', datasource.name, AdxQueryType.Databases, '1', {
      cluster: '$cluster',
    });
    addAdxVariable(context, dashboardPage, page, 'table', datasource.name, AdxQueryType.Tables, '2', {
      cluster: '$cluster',
      database: '$database',
    });
    addAdxVariable(context, dashboardPage, page, 'column', datasource.name, AdxQueryType.Columns, '3', {
      cluster: '$cluster',
      database: '$database',
      table: '$table',
    });
  });
});
