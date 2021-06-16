import React, { useState, useCallback } from 'react';
import { css } from 'emotion';
import { Select, Button, stylesFactory, ConfirmModal } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryEditorSection } from '../editor/components/QueryEditorSection';
import { EditorMode } from 'types';

interface Props {
  database: string;
  databases: Array<SelectableValue<string>>;
  editorMode: EditorMode;
  dirty: boolean;
  onChangeDatabase: (databaseName: string) => void;
  onRunQuery: () => void;
  onToggleEditorMode: () => void;
}

export const QueryEditorToolbar = (props: Props) => {
  const { dirty, editorMode, onToggleEditorMode } = props;
  const [showConfirm, setShowConfirm] = useState(false);
  const onToggleMode = useCallback(() => {
    if (!dirty || editorMode === EditorMode.Visual) {
      onToggleEditorMode();
      return;
    }
    setShowConfirm(true);
  }, [setShowConfirm, onToggleEditorMode, dirty, editorMode]);

  const styles = getStyles();

  return (
    <QueryEditorSection label="Database">
      <Select
        width={30}
        options={props.databases}
        placeholder="Select database"
        value={props.database}
        onChange={(selected) => {
          if (!selected || !selected.value) {
            return;
          }
          props.onChangeDatabase(selected.value);
        }}
      />
      {props.editorMode === EditorMode.Raw && (
        <>
          <div className={styles.spacing} />
          <label className="gf-form-label">(Run Query: Shift+Enter, Trigger Suggestion: Ctrl+Space)</label>
        </>
      )}
      <div className="gf-form gf-form--grow">
        <div className="gf-form-label--grow" />
      </div>
      <Button variant="secondary" onClick={onToggleMode}>
        {props.editorMode === EditorMode.Visual ? 'Edit KQL' : 'Switch to builder'}
      </Button>
      <div className={styles.spacing} />
      <Button variant={props.dirty ? 'primary' : 'secondary'} onClick={props.onRunQuery}>
        Run Query
      </Button>
      <ConfirmModal
        isOpen={showConfirm}
        title="Are you sure?"
        body="You might lose manual changes done to the query if you go back to the visual builder."
        confirmText="Yes, I am sure."
        dismissText="No, continue edit query manually."
        icon="exclamation-triangle"
        onConfirm={() => {
          setShowConfirm(false);
          props.onToggleEditorMode();
        }}
        onDismiss={() => setShowConfirm(false)}
      />
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
