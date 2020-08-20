import React from 'react';
import { css } from 'emotion';
import { Select, Button, stylesFactory } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryEditorSection } from './editor/components/QueryEditorSection';

type EditorMode = 'raw' | 'visual';

interface Props {
  database: string;
  databases: Array<SelectableValue<string>>;
  editorMode: EditorMode;
  onChangeDatabase: (databaseName: string) => void;
  onRunQuery: () => void;
  onToggleEditorMode: () => void;
}

export const QueryEditorToolbar: React.FC<Props> = props => {
  const styles = getStyles();

  return (
    <QueryEditorSection label="Database">
      <Select
        width={30}
        options={props.databases}
        placeholder="Select database"
        value={props.database}
        onChange={selected => {
          if (!selected || !selected.value) {
            return;
          }
          props.onChangeDatabase(selected.value);
        }}
      />
      {props.editorMode === 'raw' && (
        <>
          <div className={styles.spacing} />
          <label className="gf-form-label">(Run Query: Shift+Enter, Trigger Suggestion: Ctrl+Space)</label>
        </>
      )}
      <div className="gf-form gf-form--grow">
        <div className="gf-form-label--grow" />
      </div>
      <Button variant="secondary" onClick={props.onToggleEditorMode}>
        {props.editorMode === 'visual' ? 'Edit KQL' : 'Switch to builder'}
      </Button>
      <div className={styles.spacing} />
      <Button variant="secondary" onClick={props.onRunQuery}>
        Run Query
      </Button>
    </QueryEditorSection>
  );
};

const getStyles = stylesFactory(() => {
  return {
    spacing: css`
      margin-right: 4px;
    `,
  };
});
