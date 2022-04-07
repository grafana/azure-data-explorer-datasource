import { monacoTypes } from '@grafana/ui';
import { includes } from 'lodash';

const defaultTimeField = 'Timestamp';

export function getSuggestions(model: monacoTypes.editor.ITextModel, position: monacoTypes.Position) {
  const word = model.getWordUntilPosition(position);
  const prevChar = model.getValueInRange({
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn - 1,
    endColumn: word.startColumn,
  });
  const replaceRange: monaco.IRange = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: prevChar === '$' ? word.startColumn - 1 : word.startColumn,
    endColumn: word.endColumn,
  };
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });

  const timeFilterSuggestion = {
    label: 'where $__timeFilter(timeColumn)',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'where $__timeFilter(' + defaultTimeField + ')',
    documentation: {
      value:
        '##### Macro that uses the selected timerange in Grafana to filter the query.\n\n' +
        '- `$__timeFilter()` -> Uses the ' +
        defaultTimeField +
        ' column\n\n' +
        '- `$__timeFilter(datetimeColumn)` ->  Uses the specified datetime column to build the query.',
    },
    range: replaceRange,
  };

  if (!includes(textUntilPosition, '|')) {
    return { suggestions: [] };
  }

  if (!includes(textUntilPosition.toLowerCase(), 'where')) {
    return {
      suggestions: [timeFilterSuggestion],
    };
  }

  if (includes(model.getLineContent(position.lineNumber).toLowerCase(), 'where')) {
    return {
      suggestions: [
        {
          ...timeFilterSuggestion,
          label: '$__timeFilter(timeColumn)',
          insertText: '$__timeFilter(' + defaultTimeField + ')',
        },
        {
          label: '$__from',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: `$__from`,
          documentation: {
            value:
              'Built-in variable that returns the from value of the selected timerange in Grafana.\n\n' +
              'Example: `where ' +
              defaultTimeField +
              ' > $__from` ',
          },
          range: replaceRange,
        },
        {
          label: '$__to',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: `$__to`,
          documentation: {
            value:
              'Built-in variable that returns the to value of the selected timerange in Grafana.\n\n' +
              'Example: `where ' +
              defaultTimeField +
              ' < $__to` ',
          },
          range: replaceRange,
        },
        {
          label: '$__timeInterval',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: `$__timeInterval`,
          documentation: {
            value:
              '##### Built-in variable that returns an automatic time grain suitable for the current timerange.\n\n' +
              'Used with the bin() function - `bin(' +
              defaultTimeField +
              ', $__timeInterval)` \n\n' +
              '[Grafana docs](http://docs.grafana.org/reference/templating/#the-interval-variable)',
          },
          range: replaceRange,
        },
      ],
    };
  }

  return {
    suggestions: [],
  };
}

export function getSignatureHelp(
  model: monacoTypes.editor.ITextModel,
  position: monacoTypes.Position
): monacoTypes.languages.ProviderResult<monacoTypes.languages.SignatureHelpResult> {
  const word = model.getWordUntilPosition(position.delta(0, -1));
  const textUntilPosition = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: word.startColumn - 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });

  if (textUntilPosition !== '$__timeFilter(') {
    return { value: {} as monaco.languages.SignatureHelp, dispose: () => {} };
  }

  const signature: monaco.languages.SignatureHelp = {
    activeParameter: 0,
    activeSignature: 0,
    signatures: [
      {
        label: '$__timeFilter(timeColumn)',
        parameters: [
          {
            label: 'timeColumn',
            documentation:
              'Default is ' +
              defaultTimeField +
              ' column. Datetime column to filter data using the selected date range. ',
          },
        ],
      },
    ],
  };

  return { value: signature, dispose: () => {} };
}
