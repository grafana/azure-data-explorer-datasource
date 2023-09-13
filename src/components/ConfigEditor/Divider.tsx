import React from 'react';
import { Divider as GrafanaDivider, useTheme2 } from '@grafana/ui';
import { config } from '@grafana/runtime';
import { isVersionGtOrEq } from 'version';

export function Divider() {
  const theme = useTheme2();
  if (isVersionGtOrEq(config.buildInfo.version, '10.1.0')) {
    return <GrafanaDivider />;
  }
  return (
    <div
      style={{ borderTop: `1px solid ${theme.colors.border.weak}`, margin: theme.spacing(2, 0), width: '100%' }}
    ></div>
  );
}
