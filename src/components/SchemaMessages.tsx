import { GrafanaTheme2 } from '@grafana/data';
import { Icon, useStyles2 } from '@grafana/ui';
import { css } from 'emotion';
import React from 'react';

export const SchemaLoading: React.FC<{}> = (props) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        <Icon className="spin-clockwise" name="sync" />
      </div>
      <span>One moment, your schema is loading ...</span>
    </div>
  );
};

interface ErrorProps {
  message: string;
}

export const SchemaError: React.FC<ErrorProps> = (props) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        <Icon name="exclamation-triangle" className={styles.error} />
      </div>
      <span className={styles.error}>{props.message}</span>
    </div>
  );
};

export const SchemaWarning: React.FC<ErrorProps> = (props) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        <Icon name="exclamation-triangle" className={styles.warning} />
      </div>
      <span className={styles.warning}>{props.message}</span>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    margin-top: 10px;
    display: flex;
    flex-direction: row;
  `,
  icon: css`
    margin-right: 4px;
  `,
  error: css`
    color: ${theme.v1.colors.formInputBorderInvalid};
  `,
  warning: css`
    color: ${theme.v1.palette.yellow};
  `,
});
