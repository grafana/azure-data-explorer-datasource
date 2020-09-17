import React, { useMemo, useCallback } from 'react';
import { useAsync } from 'react-use';
import { css } from 'emotion';
import { KustoQuery, AdxSchema, AdxColumnSchema, defaultQuery } from '../types';
import { tableToDefinition, columnsToDefinition } from '../schema/mapper';
import {
  QueryEditorExpressionType,
  QueryEditorPropertyExpression,
  QueryEditorExpression,
  QueryEditorArrayExpression,
} from 'editor/expressions';
import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from '../editor/types';
import {
  KustoFromEditorSection,
  KustoWhereEditorSection,
  KustoValueColumnEditorSection,
  KustoGroupByEditorSection,
} from './VisualQueryEditorSections';
import { definitionToProperty } from '../editor/components/field/QueryEditorField';
import { isFieldExpression } from '../editor/guards';
import { AdxDataSource } from '../datasource';
import { AdxSchemaResolver } from '../schema/AdxSchemaResolver';
import { QueryEditorResultFormat, selectResultFormat } from '../components/QueryEditorResultFormat';
import { TextArea, stylesFactory } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { AdxAutoComplete } from '../schema/AdxAutoComplete';
import { SchemaLoading, SchemaError, SchemaWarning } from '../components/SchemaMessages';
import { getTemplateSrv } from '@grafana/runtime';

interface Props {
  database: string;
  query: KustoQuery;
  onChangeQuery: (query: KustoQuery) => void;
  schema?: AdxSchema;
  datasource: AdxDataSource;
  templateVariableOptions: SelectableValue<string>;
}

export const VisualQueryEditor: React.FC<Props> = props => {
  const { query, database, datasource, schema, onChangeQuery } = props;
  const { id: datasourceId, parseExpression } = datasource;

  const resultFormat = selectResultFormat(query.resultFormat);
  const databaseName = getTemplateSrv().replace(database);
  const tables = useTableOptions(schema, databaseName);
  const table = useSelectedTable(tables, query, datasource);
  const tableName = getTemplateSrv().replace(table?.property.name ?? '');

  const tableSchema = useAsync(async () => {
    if (!table || !table.property) {
      return [];
    }

    const schema = await getTableSchema(datasource, databaseName, tableName);
    const from = query.expression.from ?? table;

    onChangeQuery({
      ...query,
      query: parseExpression(
        {
          ...query.expression,
          from,
        },
        schema
      ),
    });

    return schema;
  }, [datasourceId, databaseName, tableName]);

  const onAutoComplete = useCallback(
    async (searchTerm?: string, column?: string) => {
      const autoComplete = new AdxAutoComplete(datasource, tableSchema.value, databaseName, tableName);
      const values = await autoComplete.search(searchTerm, column);
      return values.map(value => ({ value, label: value }));
    },
    [datasource, databaseName, tableName, tableSchema.value]
  );

  const columns = useColumnOptions(tableSchema.value);
  const groupable = useGroupableColumns(columns);

  const onChangeTable = useCallback(
    (expression: QueryEditorExpression) => {
      if (!isFieldExpression(expression) || !table) {
        return;
      }

      const next = {
        ...defaultQuery.expression,
        from: expression,
      };

      onChangeQuery({
        ...query,
        resultFormat: resultFormat,
        database: database,
        expression: next,
      });
    },
    [onChangeQuery, query, resultFormat, database, table]
  );

  const onWhereChange = useCallback(
    (expression: QueryEditorArrayExpression) => {
      const next = {
        ...query.expression,
        from: table,
        where: expression,
      };

      onChangeQuery({
        ...query,
        resultFormat: resultFormat,
        database: database,
        expression: next,
        query: parseExpression(next, tableSchema.value),
      });
    },
    [onChangeQuery, query, tableSchema.value, resultFormat, database, table, parseExpression]
  );

  const onReduceChange = useCallback(
    (expression: QueryEditorArrayExpression) => {
      const next = {
        ...query.expression,
        from: table,
        reduce: expression,
      };

      onChangeQuery({
        ...query,
        resultFormat: resultFormat,
        database: database,
        expression: next,
        query: parseExpression(next, tableSchema.value),
      });
    },
    [onChangeQuery, query, tableSchema.value, resultFormat, database, table, parseExpression]
  );

  const onGroupByChange = useCallback(
    (expression: QueryEditorArrayExpression) => {
      const next = {
        ...query.expression,
        from: table,
        groupBy: expression,
      };

      onChangeQuery({
        ...query,
        resultFormat: resultFormat,
        database: database,
        expression: next,
        query: parseExpression(next, tableSchema.value),
      });
    },
    [onChangeQuery, query, tableSchema.value, resultFormat, database, table, parseExpression]
  );

  const onChangeResultFormat = useCallback(
    (format: string) => {
      const next = {
        ...query.expression,
        from: table,
      };

      onChangeQuery({
        ...query,
        expression: next,
        database: database,
        resultFormat: format,
      });
    },
    [onChangeQuery, table, database, query]
  );

  if (tableSchema.loading) {
    return (
      <>
        <KustoFromEditorSection
          templateVariableOptions={props.templateVariableOptions}
          label="From"
          value={table}
          fields={tables}
          onChange={onChangeTable}
        />
        <SchemaLoading />
      </>
    );
  }

  if (tableSchema.error) {
    return (
      <>
        <KustoFromEditorSection
          templateVariableOptions={props.templateVariableOptions}
          label="From"
          value={table}
          fields={tables}
          onChange={onChangeTable}
        />
        <SchemaError message={`Could not load table schema: ${tableSchema.error?.message}`} />
      </>
    );
  }

  if (tableSchema.value?.length === 0) {
    return (
      <>
        <KustoFromEditorSection
          templateVariableOptions={props.templateVariableOptions}
          label="From"
          value={table}
          fields={tables}
          onChange={onChangeTable}
        />
        <SchemaWarning message="Table schema loaded successfully but without any columns" />
      </>
    );
  }

  const styles = getStyles();
  const groupBy = query.expression?.groupBy ?? defaultQuery.expression?.groupBy;

  return (
    <>
      <KustoFromEditorSection
        templateVariableOptions={props.templateVariableOptions}
        label="From"
        value={table}
        fields={tables}
        onChange={onChangeTable}
      >
        <QueryEditorResultFormat
          format={resultFormat}
          includeAdxTimeFormat={false}
          onChangeFormat={onChangeResultFormat}
        />
      </KustoFromEditorSection>
      <KustoWhereEditorSection
        templateVariableOptions={props.templateVariableOptions}
        label="Where (filter)"
        value={query.expression?.where ?? defaultQuery.expression?.where}
        fields={columns}
        onChange={onWhereChange}
        getSuggestions={onAutoComplete}
      />
      <KustoValueColumnEditorSection
        templateVariableOptions={props.templateVariableOptions}
        label="Value columns"
        value={query.expression?.reduce ?? defaultQuery.expression?.reduce}
        fields={columns}
        onChange={onReduceChange}
        getSuggestions={onAutoComplete}
      />
      <KustoGroupByEditorSection
        templateVariableOptions={props.templateVariableOptions}
        label="Group by (summarize)"
        value={groupBy}
        fields={groupable}
        onChange={onGroupByChange}
        getSuggestions={onAutoComplete}
      />
      <div className={styles.query}>
        <TextArea cols={80} rows={8} value={props.query.query} disabled={true} />
      </div>
    </>
  );
};

const getStyles = stylesFactory(() => {
  return {
    query: css`
      margin-top: 12px;
    `,
  };
});

const useGroupableColumns = (columns: QueryEditorPropertyDefinition[]): QueryEditorPropertyDefinition[] => {
  return useMemo(() => {
    return columns.filter(c => c.type === QueryEditorPropertyType.DateTime || QueryEditorPropertyType.String);
  }, [columns]);
};

const useColumnOptions = (tableSchema?: AdxColumnSchema[]): QueryEditorPropertyDefinition[] => {
  return useMemo(() => {
    if (!tableSchema) {
      return [];
    }
    return columnsToDefinition(tableSchema);
  }, [tableSchema]);
};

const useSelectedTable = (
  options: QueryEditorPropertyDefinition[],
  query: KustoQuery,
  datasource: AdxDataSource
): QueryEditorPropertyExpression | undefined => {
  return useMemo(() => {
    const from = query.expression?.from?.property.name;
    const selected = options.find(option => option.value === from);

    if (selected) {
      return {
        type: QueryEditorExpressionType.Property,
        property: definitionToProperty(selected),
      };
    }

    const variable = datasource.variables.find(variable => variable === from);

    if (variable) {
      return {
        type: QueryEditorExpressionType.Property,
        property: {
          name: variable,
          type: QueryEditorPropertyType.String,
        },
      };
    }

    if (options.length > 0) {
      return {
        type: QueryEditorExpressionType.Property,
        property: definitionToProperty(options[0]),
      };
    }

    return;
  }, [options, query.expression?.from?.property.name, datasource.variables]);
};

const useTableOptions = (schema: AdxSchema | undefined, database: string): QueryEditorPropertyDefinition[] => {
  return useMemo(() => {
    if (!schema || !schema.Databases) {
      return [];
    }

    const databaseSchema = schema.Databases[database];

    if (!databaseSchema || !databaseSchema.Tables) {
      return [];
    }

    const tables: QueryEditorPropertyDefinition[] = [];

    for (const name of Object.keys(databaseSchema.Tables)) {
      const table = databaseSchema.Tables[name];
      tables.push(tableToDefinition(table));
    }

    return tables;
  }, [database, schema]);
};

async function getTableSchema(datasource: AdxDataSource, databaseName: string, tableName: string) {
  const schemaResolver = new AdxSchemaResolver(datasource);
  return await schemaResolver.getColumnsForTable(databaseName, tableName);
}
