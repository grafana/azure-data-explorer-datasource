import { monacoTypes } from '@grafana/ui';
import { includes } from 'lodash';

const defaultTimeField = 'Timestamp';

export function getSuggestions(model: monacoTypes.editor.ITextModel, position: monacoTypes.Position) {
  const word = model.getWordUntilPosition(position);
  const range: monaco.IRange = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
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
    range,
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
          range,
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
          range,
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
          range,
        },
      ],
    };
  }

  return {
    suggestions: [],
  };
}
