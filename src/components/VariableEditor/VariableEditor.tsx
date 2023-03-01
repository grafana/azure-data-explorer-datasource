import { SelectableValue } from '@grafana/data';
import { InlineField, Select } from '@grafana/ui';
import { QueryEditor } from 'components/QueryEditor';
import { AdxDataSource } from 'datasource';
import { get } from 'lodash';
import { needsToBeMigrated, migrateQuery } from 'migrations/query';
import React, { useEffect, useState } from 'react';
import { useEffectOnce } from 'react-use';
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
    { label: 'Kusto Query', value: AdxQueryType.KustoQuery },
    { label: 'Tables', value: AdxQueryType.Tables },
  ];
  const [variableOptionGroup, setVariableOptionGroup] = useState<{ label: string; options: VariableOptions[] }>({
    label: 'Template Variables',
    options: [],
  });
  const queryType = typeof query === 'string' ? '' : query.queryType;
  const [databases, setDatabases] = useState<SelectableValue[]>([]);
  const [requireDatabase, setRequireDatabase] = useState<boolean>(false);

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
    switch (queryType) {
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

  const onQueryTypeChange = (selectableValue: SelectableValue) => {
    if (selectableValue.value) {
      onChange({
        ...query,
        queryType: selectableValue.value,
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
      {query.queryType === AdxQueryType.Tables && requireDatabase ? (
        <InlineField label="Select database" labelWidth={20}>
          <Select
            aria-label="select database"
            onChange={onDatabaseChange}
            options={databases.concat(variableOptionGroup)}
            width={25}
            value={query.database}
          />
        </InlineField>
      ) : null}
    </>
  );
};

export default VariableEditor;
