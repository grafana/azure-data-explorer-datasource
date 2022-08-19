import React, { useMemo, useState } from 'react';

import { ConfirmModal, EditorHeader, FlexItem, InlineSelect, RadioButtonGroup } from '@grafana/ui';

import { AdxSchema, EditorMode, KustoQuery } from '../../types';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { AdxDataSource } from 'datasource';
import { QueryEditorPropertyDefinition } from 'schema/types';
import { useAsync } from 'react-use';
import { databaseToDefinition } from 'schema/mapper';

export interface QueryEditorHeaderProps {
  datasource: AdxDataSource;
  query: KustoQuery;
  schema: AsyncState<AdxSchema>;
  dirty: boolean;
  setDirty: (b: boolean) => void;
  onChange: (value: KustoQuery) => void;
}

const EDITOR_MODES = [
  { label: 'Builder', value: EditorMode.Visual },
  { label: 'KQL', value: EditorMode.Raw },
];

export const QueryHeader = (props: QueryEditorHeaderProps) => {
  const { query, onChange, schema, datasource, dirty, setDirty } = props;
  const databases = useDatabaseOptions(schema.value);
  const database = useSelectedDatabase(databases, props.query, datasource);
  const [showWarning, setShowWarning] = useState(false);

  const changeEditorMode = (value: EditorMode) => {
    if (value === EditorMode.Visual && dirty) {
      setShowWarning(true);
    } else {
      onChange({ ...query, rawMode: value === EditorMode.Raw });
    }
  };

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
        options={databases}
        value={database}
        isLoading={schema.loading}
        onChange={({ value }) => {
          onChange({ ...query, database: value! });
        }}
      />
      <FlexItem grow={1} />
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
