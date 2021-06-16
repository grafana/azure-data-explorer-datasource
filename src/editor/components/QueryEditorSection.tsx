import React, { PropsWithChildren } from 'react';
import { InlineFormLabel } from '@grafana/ui';

export interface QueryEditorSectionProps {
  label: string;
}

export const QueryEditorSection = (props: PropsWithChildren<QueryEditorSectionProps>) => {
  return (
    <div className="gf-form">
      <InlineFormLabel className="query-keyword" width={12}>
        {props.label}
      </InlineFormLabel>
      {props.children}
    </div>
  );
};
