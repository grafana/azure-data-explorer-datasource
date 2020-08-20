import React, { useCallback } from 'react';
import { css } from 'emotion';
import { KustoQuery } from '../types';
import { SelectableValue } from '@grafana/data';
import { InlineFormLabel, Select, stylesFactory } from '@grafana/ui';

interface Props {
  query: KustoQuery;
  onChangeQuery: (query: KustoQuery) => void;
}

const formats: Array<SelectableValue<string>> = [
  { label: 'Time series', value: 'time_series' },
  { label: 'Table', value: 'table' },
];

export const QueryEditorResultFormat: React.FC<Props> = props => {
  const { query } = props;
  const format = useSelectedFormat(formats, query.resultFormat);
  const onChangeFormat = useCallback(
    (selectable: SelectableValue<string>) => {
      if (!selectable || !selectable.value) {
        return;
      }
      props.onChangeQuery({
        ...query,
        resultFormat: selectable.value,
      });
    },
    [query.resultFormat, props.onChangeQuery]
  );

  const styles = getStyles();

  return (
    <div className={styles.container}>
      <InlineFormLabel className="query-keyword" width={6}>
        Format as
      </InlineFormLabel>
      <Select options={formats} value={format} onChange={onChangeFormat} />
    </div>
  );
};

const getStyles = stylesFactory(() => {
  return {
    container: css`
      display: flex;
      flex-direction: row;
      margin-right: 4px;
    `,
  };
});

const useSelectedFormat = (formats: Array<SelectableValue<string>>, format?: string): string => {
  const selected = formats.find(f => f.value === format);

  if (selected && selected.value) {
    return selected.value;
  }

  if (formats.length > 0 && formats[0].value) {
    return formats[0].value;
  }

  return 'time_series';
};
