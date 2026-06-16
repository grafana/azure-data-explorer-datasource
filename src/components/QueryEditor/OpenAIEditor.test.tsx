import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { selectors } from 'test/selectors';

import { mockDatasource, mockQuery } from '../__fixtures__/Datasource';
import { OpenAIEditor } from './OpenAIEditor';

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

describe('OpenAIEditor', () => {
  it('should render the OpenAI code editor', async () => {
    await waitFor(() => render(<OpenAIEditor {...defaultProps} />));
    expect(screen.getByTestId(selectors.components.queryEditor.codeEditor.openAI)).toBeInTheDocument();
  });
});
