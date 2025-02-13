import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { mockConfigEditorProps } from 'components/__fixtures__/ConfigEditor.fixtures';
import DatabaseConfig from './DatabaseConfig';
import { mockDatasource } from 'components/__fixtures__/Datasource';
import createMockSchema from 'components/__fixtures__/schema';
import { openMenu } from 'react-select-event';

const jestPut = jest.fn().mockResolvedValue({ datasource: {} });
const mockDS = mockDatasource();
mockDS.getSchema = jest.fn().mockResolvedValue(createMockSchema());

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => ({
    put: jestPut,
  }),
  getDataSourceSrv: () => ({
    get: jest.fn().mockResolvedValue(mockDS),
  }),
}));

const defaultProps = {
  ...mockConfigEditorProps(),
  updateJsonData: jest.fn(),
};
describe('DatabaseConfig', () => {
  it('should render', async () => {
    render(<DatabaseConfig {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Default database')).toBeInTheDocument());
  });

  it('should disable the refresh schema button if there is some missing info', async () => {
    render(<DatabaseConfig {...defaultProps} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /reload schema/i })).toBeDisabled());
  });

  it('should save the data source and refresh the schema', async () => {
    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: {
          ...defaultProps.options.jsonData,
          clusterUrl: 'http://url',
          tenantId: 'id',
          clientId: 'id',
        },
        secureJsonFields: {
          ...defaultProps.options.secureJsonFields,
          clientSecret: true,
        },
      },
    };
    render(<DatabaseConfig {...props} />);
    const refreshButton = await waitFor(() => screen.getByRole('button', { name: /reload schema/i }));
    expect(refreshButton).toBeEnabled();
    refreshButton.click();
    expect(jestPut).toHaveBeenCalled();
    expect(mockDS.getSchema).toHaveBeenCalled();
    const sel = await screen.findByLabelText('choose default database');
    act(() => openMenu(sel));
    await waitFor(() => expect(screen.getByText('testdb')).toBeInTheDocument());
  });
});
