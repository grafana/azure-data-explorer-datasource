import React, { useMemo, useState, useEffect } from 'react';

import { Button, ConfirmModal, RadioButtonGroup } from '@grafana/ui';
import { EditorHeader, FlexItem, InlineSelect } from '@grafana/experimental';

import { AdxSchema, defaultQuery, EditorMode, FormatOptions, KustoQuery } from '../../types';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { AdxDataSource } from 'datasource';
import { QueryEditorPropertyDefinition } from 'schema/types';
import { useAsync } from 'react-use';
import { databaseToDefinition } from 'schema/mapper';
import { SelectableValue } from '@grafana/data';
import { selectors } from 'test/selectors';

export interface QueryEditorHeaderProps {
  datasource: AdxDataSource;
  query: KustoQuery;
  schema: AsyncState<AdxSchema>;
  dirty: boolean;
  setDirty: (b: boolean) => void;
  onChange: (value: KustoQuery) => void;
  onRunQuery: () => void;
}

const EDITOR_MODES = [
  { label: 'Builder', value: EditorMode.Visual },
  { label: 'KQL', value: EditorMode.Raw },
];

const EDITOR_FORMATS: Array<SelectableValue<string>> = [
  { label: 'Table', value: FormatOptions.table },
  { label: 'Time series', value: FormatOptions.timeSeries },
];

const adxTimeFormat: SelectableValue<string> = {
  label: 'ADX Time series',
  value: FormatOptions.adxTimeSeries,
};

export const QueryHeader = (props: QueryEditorHeaderProps) => {
  const { query, onChange, schema, datasource, dirty, setDirty, onRunQuery } = props;
  const { rawMode } = query;
  const databases = useDatabaseOptions(schema.value);
  const database = useSelectedDatabase(databases, props.query, datasource);
  const [formats, setFormats] = useState(EDITOR_FORMATS);
  const [showWarning, setShowWarning] = useState(false);

  const changeEditorMode = (value: EditorMode) => {
    if (value === EditorMode.Visual && dirty) {
      setShowWarning(true);
    } else {
      onChange({ ...query, rawMode: value === EditorMode.Raw });
    }
  };

  useEffect(() => {
    if (!query.database && database) {
      onChange({ ...query, database });
    }
  }, [query, database, onChange]);

  useEffect(() => {
    if (rawMode) {
      setFormats(EDITOR_FORMATS.concat(adxTimeFormat));
    } else {
      setFormats(EDITOR_FORMATS);
    }
  }, [rawMode]);

  useEffect(() => {
    if (!query.resultFormat) {
      onChange({ ...query, resultFormat: 'table' });
    }
    if (query.resultFormat === adxTimeFormat.value && !rawMode) {
      // Fallback to Time Series since time_series_adx_series is not available when not in rawMode
      onChange({ ...query, resultFormat: 'time_series' });
    }
  }, [query, formats, onChange]);

  return (
    <EditorHeader>
      <ConfirmModal
        isOpen={showWarning}
        title="Are you sure?"
        body="You will lose manual changes done to the query if you go back to the visual builder."
        confirmText="Confirm"
        onConfirm={() => {
          setShowWarning(false);
          onChange({ ...query, rawMode: false });
          setDirty(false);
        }}
        onDismiss={() => {
          setShowWarning(false);
        }}
      ></ConfirmModal>
      <InlineSelect
        label="Database"
        aria-label="Database"
        options={databases}
        value={database}
        isLoading={schema.loading}
        onChange={({ value }) => {
          onChange({ ...query, database: value!, expression: defaultQuery.expression });
        }}
      />
      <InlineSelect
        label="Format as"
        options={formats}
        value={query.resultFormat}
        onChange={({ value }) => {
          onChange({ ...query, resultFormat: value! });
        }}
      />
      <FlexItem grow={1} />
      <Button
        variant="primary"
        icon="play"
        size="sm"
        onClick={onRunQuery}
        data-testid={selectors.components.queryEditor.runQuery.button}
      >
        Run query
      </Button>
      <RadioButtonGroup
        size="sm"
        options={EDITOR_MODES}
        value={query.rawMode ? EditorMode.Raw : EditorMode.Visual}
        onChange={changeEditorMode}
      />
    </EditorHeader>
  );
};

const useSelectedDatabase = (
  options: QueryEditorPropertyDefinition[],
  query: KustoQuery,
  datasource: AdxDataSource
): string => {
  const defaultDB = useAsync(() => datasource.getDefaultOrFirstDatabase(), [datasource]);
  const variables = datasource.getVariables();

  return useMemo(() => {
    const selected = options.find((option) => option.value === query.database);

    if (selected) {
      return selected.value;
    }

    const variable = variables.find((variable) => variable === query.database);

    if (variable) {
      return variable;
    }

    if (options.length > 0) {
      const result = options.find((x) => x.value === defaultDB.value);

      if (result) {
        return result.value;
      } else {
        return options[0].value;
      }
    }

    return '';
  }, [options, variables, query.database, defaultDB.value]);
};

const useDatabaseOptions = (schema?: AdxSchema): QueryEditorPropertyDefinition[] => {
  return useMemo(() => {
    const databases: QueryEditorPropertyDefinition[] = [];

    if (!schema || !schema.Databases) {
      return databases;
    }

    for (const name of Object.keys(schema.Databases)) {
      const database = schema.Databases[name];
      databases.push(databaseToDefinition(database));
    }

    return databases;
  }, [schema]);
};
