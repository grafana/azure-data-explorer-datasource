import React from 'react';
import { InlineFormLabel, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

interface Props {
  labelWidth?: number;
  databases: Array<SelectableValue<string>>;
  templateVariableOptions: SelectableValue<string>;
  database: string;
  onChange: (string) => void;
  children?: React.ReactElement;
}

export const DatabaseSelect: React.FC<Props> = props => {
  return (
    <div className="gf-form">
      <InlineFormLabel className="query-keyword" width={props.labelWidth ?? 7}>
        Database
      </InlineFormLabel>
      <div className="gf-form">
        <Select
          width={30}
          options={[props.templateVariableOptions, ...props.databases]}
          placeholder="Select database"
          value={props.database}
          onChange={db => {
            props.onChange(db.value);
          }}
          // Should we, really?
          // allowCustomValue={true}
        />
      </div>
      {props.children}
    </div>
  );
};
