import React from 'react';
import { css } from 'emotion';
import { Icon, stylesFactory, useTheme } from '@grafana/ui';
import { GrafanaTheme } from '@grafana/data';

export const SchemaLoading: React.FC<{}> = (props) => {
  const theme = useTheme();
  const styles = getStyles(theme);

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

export const SchemaError = (props: ErrorProps) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        <Icon name="exclamation-triangle" className={styles.error} />
      </div>
      <span className={styles.error}>{props.message}</span>
    </div>
  );
};

export const SchemaWarning = (props: ErrorProps) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        <Icon name="exclamation-triangle" className={styles.warning} />
      </div>
      <span className={styles.warning}>{props.message}</span>
    </div>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    container: css`
      margin-top: 10px;
      display: flex;
      flex-direction: row;
    `,
    icon: css`
      margin-right: 4px;
    `,
    error: css`
      color: ${theme.colors.formInputBorderInvalid};
    `,
    warning: css`
      color: ${theme.palette.yellow};
    `,
  };
});
