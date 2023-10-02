import { test, expect } from '@playwright/test';
import { selectors } from '@grafana/e2e-selectors';
import { v4 as uuidv4 } from 'uuid';

const DASHBOARD_TITLE = `e2e-test-dashboard-${uuidv4()}`;
const DATASOURCE_NAME = `adx-e2e-test-${uuidv4()}`;

const getDashboardUid = (url) => {
  const matches = new URL(url).pathname.match(/\/d\/([^/]+)/);

  if (matches && Array.isArray(matches) && matches.length > 0) {
    return matches[1];
  } else {
    throw new Error(`Couldn't parse uid from ${url}`);
  }
};

test('Login', async ({ page }) => {
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
  fields.username.fill('admin');
  fields.password.fill('admin');
  await buttons.submit.click();

  // checks page for skip change password screen
  expect(buttons.skip).toBeAttached();

  await buttons.skip.click();
});

test('Add datasource', async ({ page }) => {
  await page.goto(`http://localhost:3000${selectors.pages.AddDataSource.url}`, {
    waitUntil: 'networkidle',
  });

  // select datasource
  const label = selectors.pages.AddDataSource.dataSourcePluginsV2('Azure Data Explorer Datasource');
  const ds = page.locator(`button[aria-label="${label}"]`);
  await ds.click();

  // name datasource
  const dsName = page.locator(`input[aria-label="${selectors.pages.DataSource.name}"]`);
  dsName.fill('');
  dsName.fill(`${DATASOURCE_NAME}`);

  // form inputs
  const inputs = {
    'Client ID': '',
    'Client Secret': '',
    'Cluster URL': '',
    'Tenant ID': '',
  };

  // fill in form inputs
  Object.entries(inputs).forEach(([key, value]) => page.locator(`input[aria-label="${key}"]`).fill(value));

  // save and test
  const saveBtn = page.locator(`button[data-testid="data-testid ${selectors.pages.DataSource.saveAndTest}"]`);
  await saveBtn.click();

  // checks the page for the data source is working message
  expect(page.locator('[aria-label="Create a dashboard"]')).toContainText('building a dashboard');
});

test('Add dashboard', async ({ page }) => {
  await page.goto(`http://localhost:3000${selectors.pages.AddDashboard.url}`, { waitUntil: 'networkidle' });

  // checks for the create dashboard button
  const saveDashboardToolbarButton = page.locator(
    `button[aria-label="${selectors.components.PageToolbar.item('Save dashboard')}"]`
  );

  // create dashboard
  await saveDashboardToolbarButton.click();

  // name dashboard
  const dashboardTitleInput = page.locator(`input[aria-label="${selectors.pages.SaveDashboardAsModal.newName}"]`);
  dashboardTitleInput.fill('');
  dashboardTitleInput.fill(DASHBOARD_TITLE);

  // save dashboard
  const saveDashboardModalButton = page.locator(`button[aria-label="${selectors.pages.SaveDashboardAsModal.save}"]`);
  await saveDashboardModalButton.click();

  // checks that the dashboard is created successfully
  expect(page.locator('div[data-testid="data-testid Alert success"]')).toBeAttached();
});

test('Configure panel', async ({ page }) => {
  const dashboardURL = page.url();
  await page.goto(`${dashboardURL}`, { waitUntil: 'networkidle' });

  // add panel
  const addPanelButton = page.locator('button[data-testid="data-testid Create new panel button"]');
  await addPanelButton.click();

  // select data source for panel
  page.locator('input[placeholder="Search data source"]').fill(`${DATASOURCE_NAME}`);
  page.keyboard.down('Tab');
  page.keyboard.down('Enter');

  // select database
  const database = page.locator(`[aria-label="Database"]`);
  await database.click();
  database.fill('PerfTest');
  page.keyboard.down('Enter');

  // select table
  const table = page.locator(`[aria-label="Table"]`);
  await table.click();
  table.fill('PerfTest');
  page.keyboard.down('Enter');

  // run query
  const runQueryBtn = page.locator(`[data-testid="data-testid run-query"]`);
  await runQueryBtn.click();
  // are there results?
  const columns = page.locator(`[aria-label="Columns"]`);
  await columns.click();

  expect(page.locator('[aria-label="Select options menu"]').innerHTML()).toContain('_val1_');
});

test('Remove dashboard', async ({ page }) => {
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
  expect(page.locator('div[data-testid="data-testid Alert success"]')).toBeAttached();
});
