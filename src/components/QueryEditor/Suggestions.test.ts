import { monacoTypes } from '@grafana/ui';

import { getFunctions, getSignatureHelp } from './Suggestions';
import { VariableHide, VariableRefresh, VariableSort } from '@grafana/schema';
import { LoadingState } from '@grafana/data';

describe('Suggestions', () => {
  let lineContent;
  let model;
  let signatureHelp;
  const wordPosition = { startColumn: 1, endColumn: 2 };

  beforeEach(() => {
    (window as any).monaco = {
      languages: {
        CompletionItemKind: {
          Keyword: '',
        },
      },
    };
    model = {
      getLineCount: () => 3,
      getValueInRange: () => 'atable/n' + lineContent,
      getLineContent: () => lineContent,
      getWordUntilPosition: () => wordPosition,
    };
  });
  describe('getFunctions', () => {
    it('should return macros as functions', () => {
      expect(Object.keys(getFunctions([]))).toEqual([
        '$__timeFilter',
        '$__from',
        '$__to',
        '$__timeInterval',
        '$__contains',
      ]);
    });

    it('should return template variables as functions', () => {
      expect(
        Object.keys(
          getFunctions([
            {
              type: 'query',
              name: 'foo',
              label: 'foo',
              datasource: null,
              definition: '',
              sort: VariableSort.disabled,
              query: undefined,
              regex: '',
              refresh: VariableRefresh.never,
              multi: false,
              includeAll: false,
              current: {},
              options: [],
              id: 'var',
              rootStateKey: null,
              global: false,
              hide: VariableHide.dontHide,
              skipUrlSync: true,
              index: 0,
              state: LoadingState.Done,
              error: null,
              description: null,
            },
          ])
        )
      ).toContain('$foo');
    });
  });

  describe('getSignatureHelp', () => {
    describe('when the function is not a time filter', () => {
      beforeEach(() => {
        model.getWordUntilPosition = () => ({ word: '__foo' });
        const position = { lineNumber: 2, column: 2 } as monacoTypes.Position;
        position.delta = jest.fn().mockReturnValue(position);
        signatureHelp = getSignatureHelp(model, position);
      });

      it('should not return any signature', () => {
        expect(signatureHelp.value.signatures.length).toBe(0);
      });
    });

    describe('when the function is a time filter', () => {
      beforeEach(() => {
        model.getWordUntilPosition = () => ({ word: '__timeFilter' });
        const position = { lineNumber: 2, column: 2 } as monacoTypes.Position;
        position.delta = jest.fn().mockReturnValue(position);
        signatureHelp = getSignatureHelp(model, position);
      });

      it('should not return any signature', () => {
        expect(signatureHelp.value.signatures.length).toBe(1);
      });
    });
  });
});
