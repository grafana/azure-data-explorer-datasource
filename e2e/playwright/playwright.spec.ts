import { test, expect, Page } from '@playwright/test';
import { selectors } from '@grafana/e2e-selectors';
import { v4 as uuidv4 } from 'uuid';

const DASHBOARD_TITLE = `e2e-test-dashboard-${uuidv4()}`;
const DATASOURCE_NAME = `adx-e2e-test-${uuidv4()}`;

const getDashboardUid = (url: string) => {
  const matches = new URL(url).pathname.match(/\/d\/([^/]+)/);

  if (matches && Array.isArray(matches) && matches.length > 0) {
    return matches[1];
  } else {
    throw new Error(`Couldn't parse uid from ${url}`);
  }
};

async function login(page: Page) {
  await page.goto(`http://localhost:3000${selectors.pages.Login.url}`, {
    waitUntil: 'networkidle',
  });

  const fields = {
    password: page.locator(`input[aria-label="${selectors.pages.Login.password}"]`),
    username: page.locator(`input[aria-label="${selectors.pages.Login.username}"]`),
  };

  const buttons = {
    skip: page.locator(`button[aria-label="${selectors.pages.Login.skip}"]`),
    submit: page.locator(`button[aria-label="${selectors.pages.Login.submit}"]`),
  };

  // login
  await fields.username.fill('admin');
  await fields.password.fill('admin');
  await buttons.submit.click();

  // checks page for skip change password screen
  await expect(buttons.skip.isVisible()).toBeTruthy();

  await buttons.skip.click();
}

async function addDatasource(page: Page) {
  await page.goto(`http://localhost:3000${selectors.pages.AddDataSource.url}`, {
    waitUntil: 'networkidle',
  });

  // select datasource
  const label = selectors.pages.AddDataSource.dataSourcePluginsV2('Azure Data Explorer Datasource');
  const ds = page.locator(`button[aria-label="${label}"]`);
  await ds.click();

  // name datasource
  const dsName = page.locator(`input[aria-label="${selectors.pages.DataSource.name}"]`);
  await dsName.fill('');
  await dsName.fill(`${DATASOURCE_NAME}`);

  // fill in form inputs
  await page.locator(`input[id="adx-cluster-url"]`).fill(process.env.E2E_ADX_CLUSTER_URL!);
  await page.locator(`input[id="aad-tenant-id"]`).fill(process.env.E2E_ADX_TENANT_ID!);
  await page.locator(`input[id="aad-client-id"]`).fill(process.env.E2E_ADX_CLIENT_ID!);
  await page.locator(`input[id="aad-client-secret"]`).fill(process.env.E2E_ADX_CLIENT_SECRET!);

  // save and test
  const saveBtn = page.locator(`button[data-testid="data-testid ${selectors.pages.DataSource.saveAndTest}"]`);
  await saveBtn.click();

  // checks the page for the data source is working message
  await expect(page.locator(`[aria-label="Data source settings page Alert"]`)).toContainText('Success');
}

async function addDashboard(page: Page) {
  await page.goto(`http://localhost:3000${selectors.pages.AddDashboard.url}`, { waitUntil: 'networkidle' });

  // checks for the create dashboard button
  const saveDashboardToolbarButton = page.locator(
    `button[aria-label="${selectors.components.PageToolbar.item('Save dashboard')}"]`
  );

  // create dashboard
  await saveDashboardToolbarButton.click();

  // name dashboard
  const dashboardTitleInput = page.locator(`input[aria-label="${selectors.pages.SaveDashboardAsModal.newName}"]`);
  await dashboardTitleInput.fill('');
  await dashboardTitleInput.fill(DASHBOARD_TITLE);

  // save dashboard
  const saveDashboardModalButton = page.locator(`button[aria-label="${selectors.pages.SaveDashboardAsModal.save}"]`);
  await saveDashboardModalButton.click();

  // checks that the dashboard is created successfully
  await expect(page.locator(`div[data-testid="${selectors.pages.DataSource.alert}"]`).isVisible()).toBeTruthy();
}

async function configurePanel(page: Page) {
  // add panel
  const addPanelButton = page.locator('button[data-testid="data-testid Create new panel button"]');
  await addPanelButton.click();

  // select data source for panel
  const dsPanel = page.locator('input[placeholder="Select data source"]');
  await dsPanel.fill(`${DATASOURCE_NAME}`);
  await page.keyboard.down('Tab');
  await page.keyboard.down('Enter');

  // select database
  const database = page.locator(`[aria-label="Database"]`);
  await database.click({ force: true });
  await database.fill('PerfTest');

  // select table
  const table = page.locator(`[aria-label="Table"]`);
  await table.click({ force: true });
  await table.fill('PerfTest');

  // run query
  const runQueryBtn = page.locator(`[data-testid="data-testid run-query"]`);
  await runQueryBtn.click({ force: true });

  // are there results?
  const columns = page.locator(`[aria-label="Columns"]`);
  await columns.click({ force: true });

  await page.waitForTimeout(6000);

  const html = await page.locator('[aria-label="Select options menu"]').innerHTML();
  await expect(html).toContain('_val1_');
}

export async function removeDashboard(page: Page) {
  const dashboardUID = getDashboardUid(page.url());
  await page.goto(`http://localhost:3000/d/${dashboardUID}`, { waitUntil: 'networkidle' });

  // open dashboard settings
  const dashboardSettings = page.locator(
    `button[aria-label="${selectors.components.PageToolbar.item('Dashboard settings')}"]`
  );
  await dashboardSettings.click();

  // delete dashboard
  const deleteDashboardButton = page.locator(
    `button[aria-label="${selectors.pages.Dashboard.Settings.General.deleteDashBoard}"]`
  );
  await deleteDashboardButton.click();

  // confirm delete dashboard
  const deleteDashboardModalButton = page.locator(
    `button[data-testid="data-testid ${selectors.pages.ConfirmModal.delete}"]`
  );
  await deleteDashboardModalButton.click();

  // checks for success alert message
  await expect(
    page.locator(`div[data-testid="${selectors.components.Alert.alertV2('success')}"]`).isVisible()
  ).toBeTruthy();
}

test('Azure Data Explorer dashboard', async ({ page }) => {
  await login(page);
  await addDatasource(page);
  await addDashboard(page);
  await configurePanel(page);
  await removeDashboard(page);
});
