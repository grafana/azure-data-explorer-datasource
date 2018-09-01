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
    initMonaco(containerDiv, scope);
  }, 1);

  containerDiv.onblur = () => {
    scope.onChange();
  };

  function initMonaco(containerDiv, scope) {
    const kustoCodeEditor = new KustoCodeEditor(
      containerDiv,
      scope.defaultTimeField,
      scope.getSchema,
      config
    );

    kustoCodeEditor.initMonaco(scope);

    /* tslint:disable:no-bitwise */
    kustoCodeEditor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => {
        const newValue = kustoCodeEditor.getValue();
        scope.content = newValue;
        scope.onChange();
      },
    );
    /* tslint:enable:no-bitwise */

    // Sync with outer scope - update editor content if model has been changed from outside of directive.
    scope.$watch('content', (newValue, oldValue) => {
      let editorValue = kustoCodeEditor.getValue();
      if (newValue !== editorValue && newValue !== oldValue) {
        scope.$$postDigest(function() {
          kustoCodeEditor.setEditorContent(newValue);
        });
      }
    });

    kustoCodeEditor.setOnDidChangeModelContent(() => {
      scope.$apply(() => {
        let newValue = kustoCodeEditor.getValue();
        scope.content = newValue;
      });
    });

    scope.$on('$destroy', () => {
      kustoCodeEditor.disposeMonaco();
    });
  }
}

/** @ngInject */
export function kustoMonacoEditorDirective() {
  return {
    restrict: 'E',
    template: editorTemplate,
    scope: {
      content: '=',
      onChange: '&',
      getSchema: '&',
      defaultTimeField: '@',
    },
    link: link,
  };
}

angular.module('grafana.controllers').directive('kustoMonacoEditor', kustoMonacoEditorDirective);
