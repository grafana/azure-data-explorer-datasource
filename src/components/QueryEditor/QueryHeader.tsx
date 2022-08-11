import React, { useMemo, useState, useEffect } from 'react';

import { EditorHeader, FlexItem, InlineSelect, RadioButtonGroup } from '@grafana/ui';

import { AdxSchema, EditorMode, KustoQuery } from '../../types';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { AdxDataSource } from 'datasource';
import { QueryEditorPropertyDefinition } from 'schema/types';
import { useAsync } from 'react-use';
import { databaseToDefinition } from 'schema/mapper';
import { SelectableValue } from '@grafana/data';

export interface QueryEditorHeaderProps {
  datasource: AdxDataSource;
  query: KustoQuery;
  schema: AsyncState<AdxSchema>;
  onChange: (value: KustoQuery) => void;
}

const EDITOR_MODES = [
  { label: 'Builder', value: EditorMode.Visual },
  { label: 'KQL', value: EditorMode.Raw },
];

const EDITOR_FORMATS: Array<SelectableValue<string>> = [
  { label: 'Table', value: 'table' },
  { label: 'Time series', value: 'time_series' },
];

const adxTimeFormat: SelectableValue<string> = {
  label: 'ADX Time series',
  value: 'time_series_adx_series',
};

export const QueryHeader = (props: QueryEditorHeaderProps) => {
  const { query, onChange, schema, datasource } = props;
  const { rawMode } = query;
  const databases = useDatabaseOptions(schema.value);
  const database = useSelectedDatabase(databases, props.query, datasource);
  const [formats, setFormats] = useState(EDITOR_FORMATS);
  useEffect(() => {
    if (rawMode) {
      setFormats(EDITOR_FORMATS.concat(adxTimeFormat));
    } else {
      setFormats(EDITOR_FORMATS);
    }
  }, [rawMode]);

  useEffect(() => {
    if (query.resultFormat === adxTimeFormat.value && !formats.includes(adxTimeFormat)) {
      // Fallback to Time Series since time_series_adx_series is not available
      onChange({ ...query, resultFormat: 'time_series' });
    }
  }, [query, formats, onChange]);

  return (
    <EditorHeader>
      <InlineSelect
        label="Database"
        options={databases}
        value={database}
        isLoading={schema.loading}
        onChange={({ value }) => {
          onChange({ ...query, database: value! });
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
      <RadioButtonGroup
        size="sm"
        options={EDITOR_MODES}
        value={query.rawMode ? EditorMode.Raw : EditorMode.Visual}
        onChange={(value) => {
          onChange({
            ...query,
            rawMode: value === EditorMode.Raw,
          });
        }}
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
