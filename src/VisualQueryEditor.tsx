import React, { useMemo, useCallback } from 'react';
import { KustoQuery, AdxSchema, QueryExpression } from './types';
import { tableToDefinition } from './schema/mapper';
import { QueryEditorExpressionType, QueryEditorPropertyExpression, QueryEditorExpression } from 'editor/expressions';
import { QueryEditorPropertyDefinition } from 'editor/types';
import { KustoFromEditorSection } from 'VisualQueryEditorSections';
import { definitionToProperty } from 'editor/components/field/QueryEditorField';
import { isFieldExpression } from 'editor/guards';

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
  query: KustoQuery;
  onChangeQuery: (query: KustoQuery) => void;
  datasourceSchema?: AdxSchema;
}

export const VisualQueryEditor: React.FC<Props> = props => {
  const { query, onChangeQuery } = props;

  const tables = useTableOptions(props.datasourceSchema, query.database);
  const table = useSelectedTable(tables, query);

  const onChangeTable = useCallback(
    (expression: QueryEditorExpression) => {
      if (!isFieldExpression(expression)) {
        return;
      }

      onChangeQuery({
        ...query,
        expression: {
          ...(query.expression ?? defaultQuery),
          from: expression,
        },
      });
    },
    [props.onChangeQuery, query]
  );

  if (tables.length === 0) {
    return <>Could not find any tables for database</>;
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
    </>
  );
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
