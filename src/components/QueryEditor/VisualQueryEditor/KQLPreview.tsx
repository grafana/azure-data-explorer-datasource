import React, { useState } from 'react';
import { EditorField, EditorFieldGroup, EditorRow } from '@grafana/experimental';
import { Button, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

interface KQLPreviewProps {
  query: string;
}

const KQLPreview: React.FC<KQLPreviewProps> = ({ query }) => {
  const styles = useStyles2(getStyles);
  const [hidden, setHidden] = useState(true);

  return (
    <EditorRow>
      <EditorFieldGroup>
        <EditorField label="Query Preview">
          <>
            <Button hidden={!hidden} variant="secondary" onClick={() => setHidden(false)} size="sm">
              show
            </Button>
            <div className={styles.codeBlock} hidden={hidden}>
              <pre className={styles.code}>{query}</pre>
            </div>
            <Button hidden={hidden} variant="secondary" onClick={() => setHidden(true)} size="sm">
              hide
            </Button>
          </>
        </EditorField>
      </EditorFieldGroup>
    </EditorRow>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    codeBlock: css({
      width: '100%',
      display: 'table',
      tableLayout: 'fixed',
    }),
    code: css({
      marginBottom: '4px',
    }),
  };
};

export default KQLPreview;
