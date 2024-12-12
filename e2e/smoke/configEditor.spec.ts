import { expect, test } from '@grafana/plugin-e2e';
import { selectors } from '../../src/test/selectors';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from '../../src/types';

test('renders the config editor', async ({ createDataSourceConfigPage, page, readProvisionedDataSource }) => {
  const configPage = await createDataSourceConfigPage({
    type: 'grafana-azure-data-explorer-datasource',
  });

  await expect(page.getByTestId(selectors.components.configEditor.azureCloud.input)).toBeVisible();
  await expect(page.getByTestId(selectors.components.configEditor.tenantID.input)).toBeVisible();
  await expect(page.getByTestId(selectors.components.configEditor.clientID.input)).toBeVisible();
  await expect(page.getByTestId(selectors.components.configEditor.clientSecret.input)).toBeVisible();
  await expect(page.getByTestId(selectors.components.configEditor.clusterURL.input)).toBeVisible();
});
