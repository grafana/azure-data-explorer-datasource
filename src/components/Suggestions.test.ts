import { monacoTypes } from '@grafana/ui';

import { getSignatureHelp, getSuggestions } from './Suggestions';

describe('Suggestions', () => {
  let completionItems;
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
  describe('getCompletionItems', () => {
    describe('when no where clause and no | in model text', () => {
      beforeEach(() => {
        lineContent = ' ';
        const position = { lineNumber: 2, column: 2 } as monacoTypes.Position;
        completionItems = getSuggestions(model, position);
      });

      it('should not return any grafana macros', () => {
        expect(completionItems.suggestions.length).toBe(0);
      });
    });

    describe('when no where clause in model text', () => {
      beforeEach(() => {
        lineContent = '| ';
        const position = { lineNumber: 2, column: 3 } as monacoTypes.Position;
        completionItems = getSuggestions(model, position);
      });

      it('should return grafana macros for where and timefilter', () => {
        expect(completionItems.suggestions.length).toBe(1);

        expect(completionItems.suggestions[0].label).toBe('where $__timeFilter(timeColumn)');
        expect(completionItems.suggestions[0].insertText).toBe('where $__timeFilter(Timestamp)');
      });
    });

    describe('when on line with where clause', () => {
      beforeEach(() => {
        lineContent = '| where Test == 2 and ';
        const position = { lineNumber: 2, column: 23 } as monacoTypes.Position;
        completionItems = getSuggestions(model, position);
      });

      it('should return grafana macros and variables', () => {
        expect(completionItems.suggestions.length).toBe(4);

        expect(completionItems.suggestions[0].label).toBe('$__timeFilter(timeColumn)');
        expect(completionItems.suggestions[0].insertText).toBe('$__timeFilter(Timestamp)');

        expect(completionItems.suggestions[1].label).toBe('$__from');
        expect(completionItems.suggestions[1].insertText).toBe('$__from');

        expect(completionItems.suggestions[2].label).toBe('$__to');
        expect(completionItems.suggestions[2].insertText).toBe('$__to');

        expect(completionItems.suggestions[3].label).toBe('$__timeInterval');
        expect(completionItems.suggestions[3].insertText).toBe('$__timeInterval');
      });
    });

    describe('when half a macro is already written', () => {
      beforeEach(() => {
        lineContent = '| where $__time';
        const position = { lineNumber: 2, column: 3 } as monacoTypes.Position;
        model.getValueInRange = jest
          .fn()
          // First return the previous letter
          .mockReturnValueOnce('$')
          // Then return the whole content
          .mockReturnValueOnce('atable/n' + lineContent);
        completionItems = getSuggestions(model, position);
      });

      it('should return the position of the previous character', () => {
        expect(completionItems.suggestions.length).toBe(4);
        expect(completionItems.suggestions[0].range.startColumn).toBe(wordPosition.startColumn - 1);
      });
    });
  });

  describe('getSignatureHelp', () => {
    describe('when the function is not a time filter', () => {
      beforeEach(() => {
        lineContent = '$__foo(';
        model.getValueInRange = () => lineContent;
        const position = { lineNumber: 2, column: 2 } as monacoTypes.Position;
        position.delta = jest.fn().mockReturnValue(position);
        signatureHelp = getSignatureHelp(model, position);
      });

      it('should not return any signature', () => {
        expect(signatureHelp.value.signatures).toBe(undefined);
      });
    });

    describe('when the function is a time filter', () => {
      beforeEach(() => {
        lineContent = '$__timeFilter(';
        model.getValueInRange = () => lineContent;
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
