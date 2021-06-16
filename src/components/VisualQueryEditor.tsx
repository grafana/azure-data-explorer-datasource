import React, { useMemo, useCallback } from 'react';
import { useAsync } from 'react-use';
import { css } from 'emotion';
import { KustoQuery, AdxSchema, AdxColumnSchema, defaultQuery } from '../types';
import { columnsToDefinition } from '../schema/mapper';
import {
  QueryEditorExpressionType,
  QueryEditorPropertyExpression,
  QueryEditorExpression,
  QueryEditorArrayExpression,
  QueryEditorOperatorExpression,
} from 'editor/expressions';
import { QueryEditorPropertyDefinition, QueryEditorPropertyType } from '../editor/types';
import {
  KustoPropertyEditorSection,
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

export const VisualQueryEditor = (props: Props) => {
  const { query, database, datasource, schema, onChangeQuery } = props;
  const { id: datasourceId, parseExpression, autoCompleteQuery, getSchemaMapper } = datasource;

  const resultFormat = selectResultFormat(query.resultFormat);
  const databaseName = getTemplateSrv().replace(database);
  const tables = useTableOptions(schema, databaseName, datasource);
  const table = useSelectedTable(tables, query, datasource);
  const tableName = getTemplateSrv().replace(table?.property.name ?? '');
  const tableMapping = getSchemaMapper().getMappingByValue(table?.property.name);
  const timeshiftOptions = useTimeshiftOptions();

  const tableSchema = useAsync(async () => {
    if (!table || !table.property) {
      return [];
    }

    const name = tableMapping?.value ?? tableName;
    const schema = await getTableSchema(datasource, databaseName, name);
    const expression = query.expression ?? defaultQuery.expression;
    const from = expression.from ?? table;

    onChangeQuery({
      ...query,
      query: parseExpression(
        {
          ...expression,
          from,
        },
        schema
      ),
    });

    return schema;
  }, [datasourceId, databaseName, tableName, tableMapping?.value]);

  const onAutoComplete = useCallback(
    async (index: string, search: QueryEditorOperatorExpression) => {
      const values = await autoCompleteQuery(
        {
          search,
          database: databaseName,
          expression: query.expression,
          index,
        },
        tableSchema.value
      );

      return values.map((value) => ({ value, label: value }));
    },
    [autoCompleteQuery, databaseName, tableSchema.value, query.expression]
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

  const onChangeTimeshift = useCallback(
    (expression: QueryEditorExpression) => {
      if (!isFieldExpression(expression) || !table) {
        return;
      }

      const next = {
        ...defaultQuery.expression,
        ...query.expression,
        from: table,
        timeshift: expression,
      };

      onChangeQuery({
        ...query,
        resultFormat: resultFormat,
        database: database,
        expression: next,
        query: parseExpression(next, tableSchema.value),
      });
    },
    [onChangeQuery, query, resultFormat, database, table, parseExpression, tableSchema.value]
  );

  if (tableSchema.loading) {
    return (
      <>
        <KustoPropertyEditorSection
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
        <KustoPropertyEditorSection
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
        <KustoPropertyEditorSection
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
      <KustoPropertyEditorSection
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
      </KustoPropertyEditorSection>
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
        label="Aggregate"
        value={query.expression?.reduce ?? defaultQuery.expression?.reduce}
        fields={columns}
        onChange={onReduceChange}
      />
      <KustoGroupByEditorSection
        templateVariableOptions={props.templateVariableOptions}
        label="Group by"
        value={query.expression?.groupBy ?? defaultQuery.expression?.groupBy}
        fields={groupable}
        onChange={onGroupByChange}
      />
      <hr />
      <KustoPropertyEditorSection
        templateVariableOptions={[]}
        label="Timeshift"
        value={query.expression?.timeshift ?? defaultQuery.expression?.timeshift}
        fields={timeshiftOptions}
        onChange={onChangeTimeshift}
        allowCustom={true}
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
    return columns.filter((c) => c.type === QueryEditorPropertyType.DateTime || QueryEditorPropertyType.String);
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
  const variables = datasource.getVariables();

  const from = query.expression?.from?.property.name;

  return useMemo(() => {
    const selected = options.find((option) => option.value === from);

    if (selected) {
      return {
        type: QueryEditorExpressionType.Property,
        property: definitionToProperty(selected),
      };
    }

    const variable = variables.find((variable) => variable === from);

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
  }, [options, from, variables]);
};

const useTableOptions = (
  schema: AdxSchema | undefined,
  database: string,
  datasource: AdxDataSource
): QueryEditorPropertyDefinition[] => {
  const mapper = datasource.getSchemaMapper();

  return useMemo(() => {
    if (!schema || !schema.Databases) {
      return [];
    }
    return mapper.getTableOptions(schema, database);
  }, [database, schema, mapper]);
};

async function getTableSchema(datasource: AdxDataSource, databaseName: string, tableName: string) {
  const schemaResolver = new AdxSchemaResolver(datasource);
  return await schemaResolver.getColumnsForTable(databaseName, tableName);
}

const useTimeshiftOptions = (): QueryEditorPropertyDefinition[] => {
  return useMemo((): QueryEditorPropertyDefinition[] => {
    return [
      {
        label: 'No timeshift',
        value: '',
        type: QueryEditorPropertyType.TimeSpan,
      },
      {
        label: 'Hour before',
        value: '1h',
        type: QueryEditorPropertyType.TimeSpan,
      },
      {
        label: 'Day before',
        value: '1d',
        type: QueryEditorPropertyType.TimeSpan,
      },
      {
        label: 'Week before',
        value: '7d',
        type: QueryEditorPropertyType.TimeSpan,
      },
    ];
  }, []);
};
