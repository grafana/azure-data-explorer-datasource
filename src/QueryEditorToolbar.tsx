import React from 'react';
import { Select, Button } from '@grafana/ui';
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
      <div className="gf-form gf-form--grow">
        <div className="gf-form-label--grow" />
      </div>
      <Button onClick={props.onToggleEditorMode}>
        {props.editorMode === 'visual' ? 'Edit KQL' : 'Switch to builder'}
      </Button>
      &nbsp;
      <Button variant={'secondary'} onClick={props.onRunQuery}>
        Run Query
      </Button>
    </QueryEditorSection>
  );
};
