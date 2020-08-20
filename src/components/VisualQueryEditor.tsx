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
import { AdxSchemaResovler } from '../schema/AdxSchemaResolver';
import { QueryEditorResultFormat, useSelectedFormat } from '../components/QueryEditorResultFormat';
import { KustoExpressionParser } from '../KustoExpressionParser';
import { TextArea, stylesFactory } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { AdxAutoComplete } from '../schema/AdxAutoComplete';
import { SchemaLoading, SchemaError, SchemaWarning } from '../components/SchemaMessages';

interface Props {
  database: string;
  query: KustoQuery;
  onChangeQuery: (query: KustoQuery) => void;
  schema?: AdxSchema;
  datasource: AdxDataSource;
  templateVariableOptions: SelectableValue<string>;
}

const kustoExpressionParser = new KustoExpressionParser();

export const VisualQueryEditor: React.FC<Props> = props => {
  const { query, database, datasource, schema } = props;

  const resultFormat = useSelectedFormat(query.resultFormat);
  const tables = useTableOptions(schema, database);
  const table = useSelectedTable(tables, query);
  const tableSchema = useAsync(async () => {
    if (!table || !table.property) {
      return [];
    }
    const schemaResolver = new AdxSchemaResovler(datasource);
    return await schemaResolver.getColumnsForTable(database, table.property.name);
  }, [datasource.id, database, table]);

  const onAutoComplete = useCallback(
    async (searchTerm?: string, column?: string) => {
      const tableName = table?.property.name;
      const autoComplete = new AdxAutoComplete(datasource, tableSchema.value, database, tableName);
      const values = await autoComplete.search(searchTerm, column);
      return values.map(value => ({ value, label: value }));
    },
    [datasource, database, table, tableSchema.value]
  );

  const columns = useColumnOptions(tableSchema.value);
  const groupable = useGroupableColumns(columns);

  const onChangeTable = useCallback(
    (expression: QueryEditorExpression) => {
      if (!isFieldExpression(expression)) {
        return;
      }

      const next = {
        ...defaultQuery.expression,
        from: expression,
      };

      props.onChangeQuery({
        ...props.query,
        resultFormat: resultFormat,
        database: database,
        expression: next,
        query: kustoExpressionParser.query(next, tableSchema.value),
      });
    },
    [database, props.onChangeQuery, props.query, tableSchema.value, resultFormat]
  );

  const onWhereChange = useCallback(
    (expression: QueryEditorArrayExpression) => {
      const next = {
        ...props.query.expression,
        from: table,
        where: expression,
      };

      props.onChangeQuery({
        ...props.query,
        resultFormat: resultFormat,
        database: database,
        expression: next,
        query: kustoExpressionParser.query(next, tableSchema.value),
      });
    },
    [props.onChangeQuery, props.query, tableSchema.value, resultFormat]
  );

  const onReduceChange = useCallback(
    (expression: QueryEditorArrayExpression) => {
      const next = {
        ...props.query.expression,
        reduce: expression,
      };

      props.onChangeQuery({
        ...props.query,
        resultFormat: resultFormat,
        expression: next,
        query: kustoExpressionParser.query(next, tableSchema.value),
      });
    },
    [props.onChangeQuery, props.query, tableSchema.value, resultFormat]
  );

  const onGroupByChange = useCallback(
    (expression: QueryEditorArrayExpression) => {
      const next = {
        ...props.query.expression,
        groupBy: expression,
      };

      props.onChangeQuery({
        ...props.query,
        resultFormat: resultFormat,
        expression: next,
        query: kustoExpressionParser.query(next, tableSchema.value),
      });
    },
    [props.onChangeQuery, props.query, tableSchema.value, resultFormat]
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

  return (
    <>
      <KustoFromEditorSection
        templateVariableOptions={props.templateVariableOptions}
        label="From"
        value={table}
        fields={tables}
        onChange={onChangeTable}
      >
        <QueryEditorResultFormat onChangeQuery={props.onChangeQuery} query={query} />
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
        value={query.expression?.groupBy ?? defaultQuery.expression?.groupBy}
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
  query: KustoQuery
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

    if (options.length > 0) {
      return {
        type: QueryEditorExpressionType.Property,
        property: definitionToProperty(options[0]),
      };
    }

    return;
  }, [options, query.expression?.from]);
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
