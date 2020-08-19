import React, { useMemo, useCallback } from 'react';
import { useAsync } from 'react-use';
import { KustoQuery, AdxSchema, QueryExpression, AdxTableSchema, AdxColumnSchema } from './types';
import { tableToDefinition, tablesToDefinition, columnsToDefinition } from './schema/mapper';
import {
  QueryEditorExpressionType,
  QueryEditorPropertyExpression,
  QueryEditorExpression,
  QueryEditorArrayExpression,
} from 'editor/expressions';
import { QueryEditorPropertyDefinition, QueryEditorProperty } from 'editor/types';
import { KustoFromEditorSection, KustoWhereEditorSection } from 'VisualQueryEditorSections';
import { definitionToProperty } from 'editor/components/field/QueryEditorField';
import { isFieldExpression } from 'editor/guards';
import { AdxDataSource } from 'datasource';
import { AdxSchemaResovler } from 'schema/AdxSchemaResolver';

const defaultQuery: QueryExpression = {
  where: {
    type: QueryEditorExpressionType.And,
    expressions: [],
  },
  groupBy: {
    type: QueryEditorExpressionType.And,
    expressions: [],
  },
  reduce: {
    type: QueryEditorExpressionType.And,
    expressions: [],
  },
};

interface Props {
  database: string;
  query: KustoQuery;
  onChangeQuery: (query: KustoQuery) => void;
  schema?: AdxSchema;
  datasource: AdxDataSource;
}

export const VisualQueryEditor: React.FC<Props> = props => {
  const { query, database, datasource, schema } = props;

  const tables = useTableOptions(schema, database);
  const table = useSelectedTable(tables, query);
  const tableSchema = useAsync(async () => {
    if (!table || !table.property) {
      return [];
    }

    const schemaResolver = new AdxSchemaResovler(datasource);
    return await schemaResolver.getColumnsForTable(database, table.property.name);
  }, [datasource.id, database, table]);

  const columns = useColumnOptions(tableSchema.value);

  const onChangeTable = useCallback(
    (expression: QueryEditorExpression) => {
      if (!isFieldExpression(expression)) {
        return;
      }

      props.onChangeQuery({
        ...props.query,
        expression: {
          ...(props.query.expression ?? defaultQuery),
          from: expression,
        },
      });
    },
    [props.onChangeQuery, props.query]
  );

  const onWhereChange = useCallback(
    (expression: QueryEditorArrayExpression) => {
      props.onChangeQuery({
        ...props.query,
        expression: {
          ...(query.expression ?? defaultQuery),
          where: expression,
        },
      });
    },
    [props.onChangeQuery, props.query]
  );

  if (tables.length === 0) {
    return <>Could not find any tables for database</>;
  }

  if (tableSchema.loading) {
    return (
      <>
        <KustoFromEditorSection
          templateVariableOptions={[]}
          label="From"
          value={table}
          fields={tables}
          onChange={onChangeTable}
        />
        <>Schema is loading</>
      </>
    );
  }

  if (tableSchema.error) {
    return (
      <>
        <KustoFromEditorSection
          templateVariableOptions={[]}
          label="From"
          value={table}
          fields={tables}
          onChange={onChangeTable}
        />
        <>Schema loading failed</>
      </>
    );
  }

  return (
    <>
      <KustoFromEditorSection
        templateVariableOptions={[]}
        label="From"
        value={table}
        fields={tables}
        onChange={onChangeTable}
      />
      <KustoWhereEditorSection
        templateVariableOptions={[]}
        label="Where (filter)"
        value={query.expression?.where ?? defaultQuery.where}
        fields={columns}
        onChange={onWhereChange}
        getSuggestions={async (txt: string, skip?: QueryEditorProperty) => {
          return [];
        }}
      />
    </>
  );
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
