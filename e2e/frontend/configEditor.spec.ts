import { expect, test } from '@grafana/plugin-e2e';
import { selectors } from '../../src/test/selectors';
import { AdxDataSourceOptions, AdxDataSourceSecureOptions } from '../../src/types';

test.describe('Create Azure Data Explorer datasource', () => {
  test('fills out datasource connection configuration', async ({
    createDataSourceConfigPage,
    gotoDataSourceConfigPage,
    page,
    readProvisionedDataSource,
  }) => {
    const datasource = await readProvisionedDataSource<AdxDataSourceOptions, AdxDataSourceSecureOptions>({
      fileName: 'adx.yaml',
      name: 'Azure Data Explorer',
    });
    const configPage = await gotoDataSourceConfigPage(datasource.uid);
    await expect(configPage.saveAndTest()).toBeOK();
  });
});
