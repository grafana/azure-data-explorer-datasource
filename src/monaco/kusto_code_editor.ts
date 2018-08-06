export interface SuggestionController {
  _model: any;
}

export default class KustoCodeEditor {
  splitWithNewLineRegex = /[^\n]+\n?|\n/g;
  newLineRegex = /\r?\n/;
  startsWithKustoPipeRegex = /^\|\s*/g;
  kustoPipeRegexStrict = /^\|\s*$/g;

  constructor(private codeEditor: monaco.editor.IStandaloneCodeEditor) {}

  onDidChangeCursorSelection(event) {
    // Re-trigger the suggestions right after the user selected one of the suggestions
    const acceptSuggestion = (event.source === 'modelChange' && event.reason === monaco.editor.CursorChangeReason.RecoverFromMarkers);
    if (!acceptSuggestion) {
        return;
    }
    // Remove auto pipe if necessary
    const editorTextValue = this.codeEditor.getValue();
    const autoPipeReplaced =
      this.removePipeFromSelectedSuggestion(editorTextValue, event.selection.positionLineNumber - 1, event.selection.positionColumn - 1);

    if (autoPipeReplaced) {
        this.codeEditor.setValue(autoPipeReplaced);
        return;
    }

    // Do not re-trigger the suggestions if the accepted suggestion doesn't end with space.
    // Otherwise you'll get the same suggestions again.
    const  lastChar = this.getCharAtPosition(event.selection.positionLineNumber, event.selection.positionColumn - 1);
    if ((lastChar !== ' ') && (lastChar !== '=') && (lastChar !== '.')) {
        return;
    }
    this.triggerSuggestions();
  }

  toSuggestionController(srv: monaco.editor.IEditorContribution): SuggestionController {
    return (<any> srv);
  }

  setEditorContent(value) {
    this.codeEditor.setValue(value);
  }

  triggerSuggestions() {
    const suggestController = this.codeEditor.getContribution("editor.contrib.suggestController");
    if (!suggestController) {
        return;
    }

    const convertedController = this.toSuggestionController(suggestController);

    convertedController._model.cancel();
    setTimeout(function () {
      convertedController._model.trigger(true);
    }, 10);
  }

  getAllLines(content?) {
    content = content || this.codeEditor.getValue();
    return content.split('\n');
  }

  getCharAtPosition(lineNumber, column) {
    const allLines = this.getAllLines() || [];
    if (allLines.length < lineNumber) {
        return '';
    }
    const line = allLines[lineNumber - 1];
    return (line.length < column) || (column < 1) ? '' : line[column - 1];
  }

  isMatchingRegex(line, regex) {
    if (line.match(regex) !== null) {
        return true;
    }
    return false;
  }

  getMultilineSubstringByPositions(editorTextValue, startLineNumber, endLineNumber, startPosition, endPosition) {
    const textByLines = editorTextValue.match(this.splitWithNewLineRegex);
    const precedingMultilineSubstringLength = this.calculateLengthByPositions(textByLines, 0, startLineNumber, 0, startPosition);
    const multilineSubstringLength =
      this.calculateLengthByPositions(textByLines, startLineNumber, endLineNumber, startPosition, endPosition);
    return editorTextValue.substring(precedingMultilineSubstringLength, precedingMultilineSubstringLength + multilineSubstringLength);
  }

  /*
  * Calculates summary length of the substring from start position to the end position
  * for multi-line text.
  *
  * @param {array<string>} textByLines - editor text splitter by end of line character including end of line character
  * @param {number} startLineNumber - start line for start position
  * @param {number} endLineNumber - end line for end position
  * @param {number} startPosition - position within start line from which start to count length
  * @param {number} endPosition - position within end line on which stop to count length
  * @returns {number} length of the sub-string.
  */
  calculateLengthByPositions(textByLines, startLineNumber, endLineNumber, startPosition, endPosition) {
    if (!(Array.isArray(textByLines) && textByLines.length) ||
        (Array.isArray(textByLines) && textByLines.length === 1 && textByLines[0] === '')) {
        return 0;
    }
    if (startLineNumber === endLineNumber && (Array.isArray(textByLines) && startLineNumber < textByLines.length)) {
        return endPosition - startPosition;
    }
    let lengthByPosition = 0;
    let currentLine = '';
    let i;
    for (i = startLineNumber; i <= endLineNumber; i++) {
        currentLine = textByLines[i];
        if (i === startLineNumber) {
            lengthByPosition = lengthByPosition + (currentLine.length - startPosition);
        } else if (i === endLineNumber) {
            lengthByPosition = lengthByPosition + endPosition;
        } else {
            lengthByPosition = lengthByPosition + currentLine.length;
        }
    }
    return lengthByPosition;
  }

  /*
  * Updates value of the suggestion for the model and removes auto-pipe if
  * text after suggestion starts with pipe
  *
  * @param {string} editorTextValue - string representing editor text including suggested value
  * @param {number} cursorLinePosition - current cursor line position
  * @param {number} cursorColumnPosition - current cursor column position
  * @returns {string} editor text value with auto pipe removed
  */
  removePipeFromSelectedSuggestion(editorTextValue, cursorLinePosition, cursorColumnPosition) {
    // Exclude empty values from processing
    if (!editorTextValue || cursorLinePosition < 0) {
        return '';
    }
    const textByLines = editorTextValue.match(this.splitWithNewLineRegex);
    // If cursor line position is out of bounds (shouldn't happen)
    if (textByLines == null || cursorLinePosition > textByLines.length) {
        return '';
    }
    const autoPipeSuggestionLine = textByLines[cursorLinePosition];
    // Still if we got incorrect line (shouldn't happen)
    if (!autoPipeSuggestionLine) {
        return '';
    }
    const isModelSuggestedPipe =
    this.isMatchingRegex(
        autoPipeSuggestionLine.substring(0, cursorColumnPosition),
        this.kustoPipeRegexStrict);
    // If we have auto pipe added
    if (isModelSuggestedPipe) {
        const lineNumberBeforePipe = cursorLinePosition - 1;
        const isTextAfterAutoPipeOnSameLine =
          autoPipeSuggestionLine.substring(cursorColumnPosition).replace(this.newLineRegex, '').length > 0;
        const lineNumberAfterPipe = isTextAfterAutoPipeOnSameLine ? cursorLinePosition : cursorLinePosition + 1;
        const lineAfterAutoPipeStartPosition = isTextAfterAutoPipeOnSameLine ? cursorColumnPosition : 0;
        // If we have consecutive - remove one
        if (lineNumberAfterPipe < textByLines.length
            && this.isMatchingRegex(
              textByLines[lineNumberAfterPipe].substring(lineAfterAutoPipeStartPosition).trim(),
              this.startsWithKustoPipeRegex)) {

            const textBeforeAutoPipe = this.getMultilineSubstringByPositions(
              editorTextValue, 0, lineNumberBeforePipe, 0, textByLines[lineNumberBeforePipe].length
            );
            const textWithAutoPipeShift = isTextAfterAutoPipeOnSameLine ? cursorColumnPosition : autoPipeSuggestionLine.length;
            const textAfterAutoPipe = editorTextValue.substring(textBeforeAutoPipe.length + textWithAutoPipeShift);
            const newTextValue = textBeforeAutoPipe + textAfterAutoPipe;
            return newTextValue;
        }
    }
    return '';
  }

  getCompletionItems() {
    const timeFilterDocs = '##### Macro that uses the selected timerange in Grafana to filter the query.\n\n' +
          '- `$__timeFilter()` -> Uses the TimeGenerated column\n\n' +
          '- `$__timeFilter(datetimeColumn)` ->  Uses the specified datetime column to build the query.';
    return [
      {
        label: 'where $__timeFilter(timeColumn)',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: {
          value: `where \\$__timeFilter($0)`
        },
        documentation: {
          value: timeFilterDocs
        }
      },
      {
        label: '$__timeFilter(timeColumn)',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: {
          value: `\\$__timeFilter($0)`
        },
        documentation: {
          value: timeFilterDocs
        }
      },
      {
        label: '$__from',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: {
          value: `\\$__from`
        },
        documentation: {
          value: 'Built-in variable that returns the from value of the selected timerange in Grafana.\n\n'
            + 'Example: `where TimeGenerated > $__from` '
        }
      },
      {
        label: '$__to',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: {
          value: `\\$__to`
        },
        documentation: {
          value: 'Built-in variable that returns the to value of the selected timerange in Grafana.\n\n'
            + 'Example: `where TimeGenerated < $__to` '
        }
      },
      {
        label: '$__interval',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: {
          value: `\\$__interval`
        },
        documentation: {
          value: '##### Built-in variable that returns an automatic time grain suitable for the current timerange.\n\n' +
            'Used with the bin() function - `bin(TimeGenerated, $__interval)` \n\n' +
            '[Grafana docs](http://docs.grafana.org/reference/templating/#the-interval-variable)'
        }
      },
    ];
  }
}
