import { browser } from 'k6/experimental/browser';
import { check, fail, sleep } from 'k6';

import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { selectors } from 'https://unpkg.com/@grafana/e2e-selectors@9.4.3/dist/index.js';

const DASHBOARD_TITLE = `e2e-test-dashboard-${uuidv4()}`;
const DATASOURCE_NAME = `adx-e2e-test-${uuidv4()}`;

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
  },
};

const getDashboardUid = (url) => {
  const matches = new URL(url).pathname.match(/\/d\/([^/]+)/);

  if (matches && Array.isArray(matches) && matches.length > 0) {
    return matches[1];
  } else {
    throw new Error(`Couldn't parse uid from ${url}`);
  }
};

export async function login(page) {
  try {
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
    fields.username.type('admin');
    fields.password.type('admin');
    await buttons.submit.click();

    // checks page for skip change password screen
    check(page, { 'change password is presented': buttons.skip });

    await Promise.all([page.waitForNavigation(), buttons.skip.click()]);
  } catch (e) {
    fail(`login failed: ${e}`);
  }
}

export async function addDatasource(page) {
  try {
    await page.goto(`http://localhost:3000${selectors.pages.AddDataSource.url}`, {
      waitUntil: 'networkidle',
    });

    // select datasource
    const label = selectors.pages.AddDataSource.dataSourcePluginsV2('Azure Data Explorer Datasource');
    const ds = page.locator(`button[aria-label="${label}"]`);
    await Promise.all([page.waitForNavigation(), ds.click()]);

    // name datasource
    const dsName = page.locator(`input[aria-label="${selectors.pages.DataSource.name}"]`);
    dsName.fill('');
    dsName.type(`${DATASOURCE_NAME}`);

    // form inputs
    const inputs = {
      'Client ID': '',
      'Client Secret': '',
      'Cluster URL': '',
      'Tenant ID': '',
    };

    // fill in form inputs
    Object.entries(inputs).forEach(([key, value]) => page.locator(`input[aria-label="${key}"]`).type(value));

    // save and test
    const saveBtn = page.locator(`button[data-testid="data-testid ${selectors.pages.DataSource.saveAndTest}"]`);
    await saveBtn.click();

    // checks the page for the data source is working message
    check(page, {
      'add datasource successful':
        (await page.locator('[aria-label="Create a dashboard"]').textContent()) === 'building a dashboard',
    });
  } catch (e) {
    fail(`add datasource failed: ${e}`);
  }
}

export async function addDashboard(page) {
  try {
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
    dashboardTitleInput.type(DASHBOARD_TITLE);

    // save dashboard
    const saveDashboardModalButton = page.locator(`button[aria-label="${selectors.pages.SaveDashboardAsModal.save}"]`);
    await saveDashboardModalButton.click();

    // checks that the dashboard is created successfully
    check(page, {
      'dashboard created successfully': page.locator('div[data-testid="data-testid Alert success"]').isVisible(),
    });
  } catch (e) {
    fail(`add dashboard failed: ${e}`);
  }
}

export async function configurePanel(page) {
  try {
    const dashboardURL = page.url();
    await page.goto(`${dashboardURL}`, { waitUntil: 'networkidle' });

    // add panel
    const addPanelButton = page.locator('button[data-testid="data-testid Create new panel button"]');
    await addPanelButton.click();

    // select data source for panel
    page.locator('input[placeholder="Search data source"]').type(`${DATASOURCE_NAME}`);
    page.keyboard.down('Tab');
    page.keyboard.down('Enter');

    // select database
    const database = page.locator(`[aria-label="Database"]`);
    await database.click();
    database.type('PerfTest');
    page.keyboard.down('Enter');

    sleep(1);

    // select table
    const table = page.locator(`[aria-label="Table"]`);
    await table.click();
    table.type('PerfTest');
    page.keyboard.down('Enter');

    // run query
    const runQueryBtn = page.locator(`[data-testid="data-testid run-query"]`);
    await runQueryBtn.click();

    sleep(10);

    // are there results?
    const columns = page.locator(`[aria-label="Columns"]`);
    await columns.click();

    check(page, {
      'query successful': page.locator('[aria-label="Select options menu"]').innerHTML().includes('_val1_'),
    });
  } catch (e) {
    fail(`run query failed: ${e}`);
  }
}

export async function removeDashboard(page) {
  try {
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
    check(page, {
      'dashboard deleted successfully': page.locator('div[data-testid="data-testid Alert success"]').isVisible(),
    });
  } catch (e) {
    fail(`remove datasource failed: ${e}`);
  }
}

export default async function () {
  const page = browser.newPage();

  try {
    await login(page);
    await addDatasource(page);
    await addDashboard(page);
    await configurePanel(page);
    await removeDashboard(page);
  } catch (e) {
    fail(`e2e test failed: ${e}`);
  }
}
