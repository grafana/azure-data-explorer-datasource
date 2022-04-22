import { render, screen } from '@testing-library/react';
import React from 'react';
import { selectors } from 'test/selectors';

import { mockDatasource, mockQuery } from './__fixtures__/Datasource';
import { RawQueryEditor } from './RawQueryEditor';

jest.mock('../monaco/KustoMonacoEditor', () => {
  return {
    KustoMonacoEditor: function C() {
      return <></>;
    },
  };
});

let mockedRuntime;
jest.mock('@grafana/runtime', () => {
  const original = jest.requireActual('@grafana/runtime');
  mockedRuntime = { ...original };
  mockedRuntime.config.buildInfo.version = '8.1.0';

  return mockedRuntime;
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
  describe('when the Grafana version is <8.5', () => {
    it('should render legacy editor', () => {
      render(<RawQueryEditor {...defaultProps} />);
      expect(screen.getByTestId(selectors.components.queryEditor.codeEditorLegacy.container)).toBeInTheDocument();
    });
  });

  describe('when the Grafana version is >=8.5', () => {
    beforeEach(() => {
      mockedRuntime.config.buildInfo.version = '8.5.0';
    });
    it('should render the new code editor', async () => {
      render(<RawQueryEditor {...defaultProps} />);
      expect(screen.getByTestId(selectors.components.queryEditor.codeEditor.container)).toBeInTheDocument();
      await screen.findByText('Loading...');
    });
  });
});
