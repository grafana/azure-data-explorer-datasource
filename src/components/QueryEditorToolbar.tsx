import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Button, ConfirmModal, Select, useStyles2 } from '@grafana/ui';
import React, { useCallback, useState } from 'react';
import { EditorMode } from 'types';

import { QueryEditorSection } from '../editor/components/QueryEditorSection';

interface Props {
  database: string;
  databases: Array<SelectableValue<string>>;
  editorMode: EditorMode;
  dirty: boolean;
  onChangeDatabase: (databaseName: string) => void;
  onRunQuery: () => void;
  onToggleEditorMode: () => void;
}

export const QueryEditorToolbar: React.FC<Props> = (props) => {
  const { dirty, editorMode, onToggleEditorMode } = props;
  const [showConfirm, setShowConfirm] = useState(false);
  const onToggleMode = useCallback(() => {
    if (!dirty || editorMode === EditorMode.Visual) {
      onToggleEditorMode();
      return;
    }
    setShowConfirm(true);
  }, [setShowConfirm, onToggleEditorMode, dirty, editorMode]);

  const styles = useStyles2(getStyles);

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

const getStyles = (theme: GrafanaTheme2) => ({
  spacing: css`
    margin-right: 4px;
  `,
});
