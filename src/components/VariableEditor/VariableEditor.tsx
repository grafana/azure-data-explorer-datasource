import { SelectableValue } from '@grafana/data';
import { InlineField, Select } from '@grafana/ui';
import { QueryEditor } from 'components/QueryEditor';
import { AdxDataSource } from 'datasource';
import { get } from 'lodash';
import { needsToBeMigrated, migrateQuery } from 'migrations/query';
import React, { useEffect, useState } from 'react';
import { useEffectOnce } from 'react-use';
import { AdxSchemaResolver } from 'schema/AdxSchemaResolver';
import { AdxQueryType, KustoQuery } from 'types';

type VariableProps = {
  query: KustoQuery;
  onChange: (query: KustoQuery) => void;
  datasource: AdxDataSource;
};

interface VariableOptions<T = string> {
  label: string;
  value: T;
  options?: VariableOptions;
}

const VariableEditor = (props: VariableProps) => {
  const { query, onChange, datasource } = props;
  const VARIABLE_TYPE_OPTIONS = [
    { label: 'Databases', value: AdxQueryType.Databases },
    { label: 'Tables', value: AdxQueryType.Tables },
    { label: 'Columns', value: AdxQueryType.Columns },
    { label: 'Kusto Query', value: AdxQueryType.KustoQuery },
  ];
  const [variableOptionGroup, setVariableOptionGroup] = useState<{ label: string; options: VariableOptions[] }>({
    label: 'Template Variables',
    options: [],
  });
  const queryType = typeof query === 'string' ? '' : query.queryType;

  const [databases, setDatabases] = useState<SelectableValue[]>([]);
  const [tables, setTables] = useState<SelectableValue[]>([]);
  const [requireDatabase, setRequireDatabase] = useState<boolean>(false);
  const [requireTable, setRequireTable] = useState<boolean>(false);

  useEffectOnce(() => {
    let processedQuery = query;
    if (needsToBeMigrated(query)) {
      processedQuery = migrateQuery(query);
      onChange(processedQuery);
    }
  });

  useEffect(() => {
    const options: VariableOptions[] = [];
    datasource.getVariablesRaw().forEach((v) => {
      if (get(v, 'query.queryType') !== queryType) {
        options.push({ label: v.label || v.name, value: `$${v.name}` });
      }
    });
    setVariableOptionGroup({
      label: 'Template Variables',
      options,
    });
  }, [datasource, queryType]);

  useEffect(() => {
    setRequireDatabase(false);
    setRequireTable(false);
    switch (queryType) {
      case AdxQueryType.Columns:
        setRequireDatabase(true);
        setRequireTable(true);
      case AdxQueryType.Tables:
        setRequireDatabase(true);
        break;
      case AdxQueryType.Databases:
      case AdxQueryType.KustoQuery:
    }
  }, [queryType]);

  useEffectOnce(() => {
    datasource
      .getDatabases()
      .then((databases) => setDatabases(databases.map((db) => ({ label: db.text, value: db.value }))));
  });

  useEffect(() => {
    if (queryType === AdxQueryType.Columns) {
      const schemaResolver = new AdxSchemaResolver(datasource);
      if (query.database) {
        schemaResolver
          .getTablesForDatabase(query.database)
          .then((tables) => setTables(tables.map((table) => ({ label: table.Name, value: table.Name }))));
      }
    }
  }, [query, queryType, datasource]);

  const onQueryTypeChange = (selectableValue: SelectableValue) => {
    if (selectableValue.value) {
      onChange({
        ...query,
        queryType: selectableValue.value,
        database: '',
        table: undefined,
      });
    }
  };

  const onDatabaseChange = (selectableValue: SelectableValue) => {
    if (selectableValue.value) {
      onChange({
        ...query,
        database: selectableValue.value,
      });
    }
  };

  const onTableChange = (selectableValue: SelectableValue) => {
    if (selectableValue.value) {
      onChange({
        ...query,
        table: selectableValue.value,
      });
    }
  };

  return (
    <>
      <InlineField label="Select query type" labelWidth={20}>
        <Select
          aria-label="select query type"
          onChange={onQueryTypeChange}
          options={VARIABLE_TYPE_OPTIONS}
          width={25}
          value={queryType}
        />
      </InlineField>
      {query.queryType === AdxQueryType.KustoQuery && (
        <QueryEditor query={query} onChange={onChange} datasource={datasource} onRunQuery={() => {}} />
      )}
      {requireDatabase && (
        <InlineField label="Select database" labelWidth={20}>
          <Select
            aria-label="select database"
            onChange={onDatabaseChange}
            options={databases.concat(variableOptionGroup)}
            width={25}
            value={query.database || null}
          />
        </InlineField>
      )}
      {requireTable && (
        <InlineField label="Select table" labelWidth={20}>
          <Select
            aria-label="select table"
            onChange={onTableChange}
            options={tables.concat(variableOptionGroup)}
            width={25}
            value={query.table || null}
          />
        </InlineField>
      )}
    </>
  );
};

export default VariableEditor;
