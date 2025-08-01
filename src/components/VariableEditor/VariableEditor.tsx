import { t } from '@grafana/i18n';
import { SelectableValue } from '@grafana/data';
import { Field, Select } from '@grafana/ui';
import { QueryEditor } from 'components/QueryEditor/QueryEditor';
import { AdxDataSource } from 'datasource';
import { selectors } from 'test/selectors';
import { get } from 'lodash';
import { needsToBeMigrated, migrateQuery } from 'migrations/query';
import React, { useEffect, useState } from 'react';
import { useEffectOnce } from 'react-use';
import { AdxSchemaResolver } from 'schema/AdxSchemaResolver';
import { AdxQueryType, KustoQuery } from 'types';

export type VariableProps = {
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
    {
      label: t('components.variable-editor.variable_type_options.label.clusters', 'Clusters'),
      value: AdxQueryType.Clusters,
    },
    {
      label: t('components.variable-editor.variable_type_options.label.databases', 'Databases'),
      value: AdxQueryType.Databases,
    },
    { label: t('components.variable-editor.variable_type_options.label.tables', 'Tables'), value: AdxQueryType.Tables },
    {
      label: t('components.variable-editor.variable_type_options.label.columns', 'Columns'),
      value: AdxQueryType.Columns,
    },
    {
      label: t('components.variable-editor.variable_type_options.label.kusto-query', 'Kusto Query'),
      value: AdxQueryType.KustoQuery,
    },
  ];
  const [variableOptionGroup, setVariableOptionGroup] = useState<{ label: string; options: VariableOptions[] }>({
    label: 'Template Variables',
    options: [],
  });
  const queryType = typeof query === 'string' ? '' : query.queryType;

  const [clusters, setClusters] = useState<SelectableValue[]>([]);
  const [databases, setDatabases] = useState<SelectableValue[]>([]);
  const [tables, setTables] = useState<SelectableValue[]>([]);
  const [requireCluster, setRequireCluster] = useState<boolean>(false);
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
      label: t('components.variable-editor.label.template-variables', 'Template Variables'),
      options,
    });
  }, [datasource, queryType]);

  useEffect(() => {
    setRequireCluster(false);
    setRequireDatabase(false);
    setRequireTable(false);
    switch (queryType) {
      case AdxQueryType.Columns:
        setRequireDatabase(true);
        setRequireTable(true);
      case AdxQueryType.Tables:
        setRequireDatabase(true);
      case AdxQueryType.Databases:
        setRequireCluster(true);
        break;
      case AdxQueryType.Clusters:
      case AdxQueryType.KustoQuery:
    }
  }, [queryType]);

  useEffectOnce(() => {
    datasource
      .getClusters()
      .then((clusters) => setClusters(clusters.map((cluster) => ({ label: cluster.name, value: cluster.uri }))));
  });

  useEffect(() => {
    if (queryType === '' || queryType === AdxQueryType.Clusters) {
      return;
    }
    datasource
      .getDatabases(query.clusterUri)
      .then((databases) => setDatabases(databases.map((db) => ({ label: db.text, value: db.value }))));
    setTables([]);
  }, [datasource, query.clusterUri, queryType]);

  useEffect(() => {
    if (queryType !== AdxQueryType.Columns) {
      return;
    }
    const schemaResolver = new AdxSchemaResolver(datasource);
    if (query.database) {
      schemaResolver
        .getTablesForDatabase(query.database, query.clusterUri)
        .then((tables) => setTables(tables.map((table) => ({ label: table.Name, value: table.Name }))));
    }
  }, [query, queryType, datasource]);

  const onQueryTypeChange = (selectableValue: SelectableValue) => {
    if (selectableValue.value) {
      onChange({
        ...query,
        queryType: selectableValue.value,
        clusterUri: '',
        database: '',
        table: undefined,
      });
    }
  };

  const onClusterChange = (selectableValue: SelectableValue) => {
    if (selectableValue.value) {
      onChange({
        ...query,
        clusterUri: selectableValue.value,
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
      <Field
        label={t('components.variable-editor.label-query-type', 'Query Type')}
        data-testid={selectors.components.variableEditor.queryType.input}
      >
        <Select
          aria-label={t('components.variable-editor.aria-label-select-query-type', 'Select query type')}
          onChange={onQueryTypeChange}
          options={VARIABLE_TYPE_OPTIONS}
          width={25}
          value={queryType}
        />
      </Field>
      {query.queryType === AdxQueryType.KustoQuery && (
        <QueryEditor query={query} onChange={onChange} datasource={datasource} onRunQuery={() => {}} />
      )}
      {requireCluster && (
        <Field
          label={t('components.variable-editor.label-cluster', 'Cluster')}
          data-testid={selectors.components.variableEditor.clusters.input}
        >
          <Select
            aria-label={t('components.variable-editor.aria-label-select-cluster', 'Select cluster')}
            onChange={onClusterChange}
            options={clusters.concat(variableOptionGroup)}
            width={25}
            value={query.clusterUri || null}
          />
        </Field>
      )}
      {requireDatabase && (
        <Field
          label={t('components.variable-editor.label-database', 'Database')}
          data-testid={selectors.components.variableEditor.databases.input}
        >
          <Select
            aria-label={t('components.variable-editor.aria-label-select-database', 'Select database')}
            onChange={onDatabaseChange}
            options={databases.concat(variableOptionGroup)}
            width={25}
            value={query.database || null}
          />
        </Field>
      )}
      {requireTable && (
        <Field
          label={t('components.variable-editor.label-table', 'Table')}
          data-testid={selectors.components.variableEditor.tables.input}
        >
          <Select
            aria-label={t('components.variable-editor.aria-label-select-table', 'Select table')}
            onChange={onTableChange}
            options={tables.concat(variableOptionGroup)}
            width={25}
            value={query.table || null}
          />
        </Field>
      )}
    </>
  );
};

export default VariableEditor;
