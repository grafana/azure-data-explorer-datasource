import { render, screen } from '@testing-library/react';
import React from 'react';
import { selectors } from 'test/selectors';

import { mockDatasource, mockQuery } from '../__fixtures__/Datasource';
import { RawQueryEditor } from './RawQueryEditor';

jest.mock('@grafana/runtime', () => {
  const original = jest.requireActual('@grafana/runtime');
  return {
    ...original,
    getTemplateSrv: () => ({
      getVariables: () => [],
    }),
    config: {
      ...original.config,
      buildInfo: {
        ...original.config.buildInfo,
        version: '8.1.0',
      },
    },
  };
});

const defaultProps = {
  database: 'default',
  templateVariableOptions: {},
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
  datasource: mockDatasource(),
  query: mockQuery,
  schema: { Databases: {} },
  setDirty: jest.fn(),
};

describe('RawQueryEditor', () => {
  it('should render the  code editor', async () => {
    render(<RawQueryEditor {...defaultProps} />);
    expect(screen.getByTestId(selectors.components.queryEditor.codeEditor.container)).toBeInTheDocument();
    await screen.findByTestId('Spinner');
  });
});
