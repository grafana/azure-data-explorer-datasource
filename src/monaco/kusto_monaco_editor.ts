///<reference path="../../node_modules/monaco-editor/monaco.d.ts" />

import angular from 'angular';
import '../lib/bridge.js';
import '../lib/monaco.min.js';
import KustoCodeEditor from './kusto_code_editor';
import config from 'grafana/app/core/config';

let editorTemplate = `<div id="content" tabindex="0" style="width: 100%; height: 250px"></div>`;

function link(scope, elem, attrs) {
  const containerDiv = elem.find('#content')[0];
  setTimeout(() => {
    initMonaco(containerDiv);
  }, 1);

  containerDiv.onblur = () => {
    scope.onChange();
  };

  function initMonaco(containerDiv) {
    const themeName = config.bootData.user.lightTheme ? 'grafana-light': 'vs-dark';

    monaco.editor.defineTheme('grafana-light', {
      base: 'vs',
      inherit: true,
      rules: [
          { token: 'comment', foreground: '008000' },
          { token: 'variable.predefined', foreground: '800080' },
          { token: 'function', foreground: '0000FF' },
          { token: 'operator.sql', foreground: 'FF4500' },
          { token: 'string', foreground: 'B22222' },
          { token: 'operator.scss', foreground: '0000FF' },
          { token: 'variable', foreground: 'C71585' },
          { token: 'variable.parameter', foreground: '9932CC' },
          { token: '', foreground: '000000' },
          { token: 'type', foreground: '0000FF' },
          { token: 'tag', foreground: '0000FF' },
          { token: 'annotation', foreground: '2B91AF' },
          { token: 'keyword', foreground: '0000FF' },
          { token: 'number', foreground: '191970' },
          { token: 'annotation', foreground: '9400D3' },
          { token: 'invalid', background: 'cd3131' },
      ],
      colors: {
        'textCodeBlock.background': '#FFFFFF',
      }
    });

    const codeEditor = monaco.editor.create(containerDiv, {
      value: scope.content || 'Write your query here',
      language: 'kusto',
      selectionHighlight: false,
      theme: themeName,
      folding: true,
      lineNumbers: 'off',
      lineHeight: 16,
      suggestFontSize: 13,
      dragAndDrop: false,
      occurrencesHighlight: false,
      minimap: {
          enabled: false
      },
      renderIndentGuides: false,
      wordWrap: 'on',
    });
    codeEditor.layout();

    monaco.languages['kusto'].kustoDefaults.setLanguageSettings({
      includeControlCommands: true,
      newlineAfterPipe: true,
      useIntellisenseV2: false,
    });

    const kustoCodeEditor = new KustoCodeEditor(codeEditor);
    const completionItems = kustoCodeEditor.getCompletionItems();

    const completionItemProvider = monaco.languages.registerCompletionItemProvider('kusto', {
      provideCompletionItems: () => {
        return completionItems;
      }
    });

    codeEditor.createContextKey('readyToExecute', true);
    /* tslint:disable:no-bitwise */
    codeEditor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      const newValue = codeEditor.getValue();
      scope.content = newValue;
      scope.onChange();
    }, 'readyToExecute');
    /* tslint:enable:no-bitwise */

    codeEditor.onDidChangeCursorSelection(event => {
      kustoCodeEditor.onDidChangeCursorSelection(event);
    });

    scope.getSchema().then(schema => {
      if (!schema) {
        return;
      }

      monaco.languages['kusto'].getKustoWorker().then(workerAccessor => {
        const model = codeEditor.getModel();
        workerAccessor(model.uri).then(worker => {
          const dbName = Object.keys(schema.Databases).length > 0 ? Object.keys(schema.Databases)[0] : '';
          worker.setSchemaFromShowSchema(schema, 'https://help.kusto.windows.net', dbName);
        });
      });
    });

    // Sync with outer scope - update editor content if model has been changed from outside of directive.
    scope.$watch('content', (newValue, oldValue) => {
      let editorValue = codeEditor.getValue();
      if (newValue !== editorValue && newValue !== oldValue) {
        scope.$$postDigest(function() {
          kustoCodeEditor.setEditorContent(newValue);
        });
      }
    });

    codeEditor.onDidChangeModelContent(() => {
      scope.$apply(() => {
        let newValue = codeEditor.getValue();
        scope.content = newValue;
      });
    });

    scope.$on('$destroy', () => {
      if (completionItemProvider) {
        try {
          completionItemProvider.dispose();
        } catch (e) {
          console.error('Failed to dispose the completion item provider.', e);
        }
      }
      if (codeEditor) {
        try {
          codeEditor.dispose();
        } catch (e) {
          console.error('Failed to dispose the editor component.', e);
        }
      }
    });

    return codeEditor;
  }
}

/** @ngInject */
export function kustoMonacoEditorDirective() {
  return {
    restrict: 'E',
    template: editorTemplate,
    scope: {
      content: '=',
      datasource: '=',
      onChange: '&',
      getSchema: '&',
    },
    link: link,
  };
}

angular.module('grafana.controllers').directive('kustoMonacoEditor', kustoMonacoEditorDirective);
