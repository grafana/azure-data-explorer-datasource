import { expect, test } from '@grafana/plugin-e2e';
import { selectors } from '../../src/test/selectors';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from '../../src/types';

test.describe('Create Azure Data Explorer datasource', () => {
  test('fills out datasource connection configuration', async ({
    createDataSourceConfigPage,
    page,
    readProvisionedDataSource,
  }) => {
    const configPage = await createDataSourceConfigPage({
      type: 'grafana-azure-data-explorer-datasource',
    });
    const datasource = await readProvisionedDataSource<AdxDataSourceOptions, AdxDataSourceSecureOptions>({
      fileName: 'adx.yaml',
    });

    // The next 3 lines are needed if feature flags for additional auth are enabled
    // await page.getByTestId(selectors.components.configEditor.authType.input).getByRole('combobox').click();
    // await page.keyboard.insertText('App Registration');
    // await page.keyboard.press('Enter');

    const credentials = datasource.jsonData;
    const secure = datasource.secureJsonData;
    await page.getByTestId(selectors.components.configEditor.azureCloud.input).getByRole('combobox').click();
    await page.keyboard.insertText('Azure');
    await page.keyboard.press('Enter');
    await page.getByTestId(selectors.components.configEditor.tenantID.input).click();
    await page.keyboard.insertText(credentials.tenantId || '');
    await page.getByTestId(selectors.components.configEditor.clientID.input).click();
    await page.keyboard.insertText(credentials.clientId || '');
    await page.getByTestId(selectors.components.configEditor.clientSecret.input).click();
    await page.keyboard.insertText((secure.clientSecret as string) || '');
    await page.getByTestId(selectors.components.configEditor.clusterURL.input).click();
    await page.keyboard.insertText(datasource.jsonData.clusterUrl);
    await expect(configPage.saveAndTest()).toBeOK();
  });
});
