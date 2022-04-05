import { config } from '@grafana/runtime';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { mockDatasource, mockQuery } from './__fixtures__/Datasource';
import { RawQueryEditor } from './RawQueryEditor';

jest.mock('../monaco/KustoMonacoEditor', () => {
  return {
    KustoMonacoEditor: function C() {
      return <></>;
    },
  };
});

const defaultProps = {
  database: 'default',
  templateVariableOptions: {},
  onChange: jest.fn(),
  onRunQuery: jest.fn(),
  datasource: mockDatasource,
  query: mockQuery,
  schema: { Databases: {} },
};

describe('RawQueryEditor', () => {
  const featureToggles = { ...config.featureToggles };

  afterEach(() => {
    config.featureToggles = featureToggles;
  });

  it('should render legacy editor', () => {
    render(<RawQueryEditor {...defaultProps} />);
    expect(screen.getByTestId('legacy-editor')).toBeInTheDocument();
  });

  it('should render the new code editor', async () => {
    config.featureToggles.adxNewCodeEditor = true;
    render(<RawQueryEditor {...defaultProps} />);
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    await screen.findByText('Loading...');
  });
});
