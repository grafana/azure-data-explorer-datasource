import KustoCodeEditor from './kusto_code_editor';

describe('KustoCodeEditor', () => {
  describe('getCompletionItems', () => {
    let editor;
    let completionItems;

    beforeEach(() => {
      (global as any).monaco = {
        languages: {
          CompletionItemKind: {
            Keyword: '',
          },
        },
      };
      const StandaloneMock = jest.fn<monaco.editor.IStandaloneCodeEditor>();
      editor = new KustoCodeEditor(new StandaloneMock());
      completionItems = editor.getCompletionItems();
    });

    it('should return grafana macros and variables', () => {
      expect(completionItems.length).toBe(5);

      expect(completionItems[0].label).toBe('where $__timeFilter(timeColumn)');
      expect(completionItems[0].insertText.value).toBe('where \\$__timeFilter($0)');

      expect(completionItems[1].label).toBe('$__timeFilter(timeColumn)');
      expect(completionItems[1].insertText.value).toBe('\\$__timeFilter($0)');

      expect(completionItems[2].label).toBe('$__from');
      expect(completionItems[2].insertText.value).toBe('\\$__from');

      expect(completionItems[3].label).toBe('$__to');
      expect(completionItems[3].insertText.value).toBe('\\$__to');

      expect(completionItems[4].label).toBe('$__interval');
      expect(completionItems[4].insertText.value).toBe('\\$__interval');
    });
  });
});
