import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { EditorField, EditorFieldGroup, EditorList, EditorRow } from '@grafana/plugin-ui';
import { QueryEditorExpression, QueryEditorExpressionType, QueryEditorReduceExpression } from 'types/expressions';
import { AdxDataSource } from 'datasource';
import React, { useState, useEffect } from 'react';
import { AdxColumnSchema, AdxDataSourceOptions, KustoQuery } from 'types';
import { QueryEditorPropertyType } from 'schema/types';
import { sanitizeAggregate } from './utils/utils';
import AggregateItem from './AggregateItem';
import { selectors } from 'test/selectors';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface AggregateSectionProps extends Props {
  columns: AdxColumnSchema[];
  database: string;
  templateVariableOptions: SelectableValue<string>;
}

const AggregateSection: React.FC<AggregateSectionProps> = ({
  query,
  datasource,
  columns,
  templateVariableOptions,
  onChange: onQueryChange,
}) => {
  const expressions = query.expression?.reduce?.expressions;
  const [aggregates, setAggregates] = useState(expressions);
  const [currentTable, setCurrentTable] = useState(query.expression?.from?.property.name);

  useEffect(() => {
    if (!aggregates.length && expressions?.length) {
      setAggregates(expressions);
    }
  }, [aggregates?.length, expressions]);

  useEffect(() => {
    // New table
    if (currentTable !== query.expression.from?.property.name) {
      // Reset state
      setAggregates([]);
      setCurrentTable(query.expression?.from?.property.name);
    }
  }, [currentTable, query.expression?.from?.property.name]);

  const onChange = (newItems: Array<Partial<QueryEditorReduceExpression>>) => {
    const cleaned = newItems.map((v): QueryEditorReduceExpression => {
      const isNewItem = Object.keys(v).length === 0;

      return {
        type: QueryEditorExpressionType.Reduce,
        property: v.property ?? { type: QueryEditorPropertyType.String, name: '' },
        reduce: v.reduce ?? { name: '', type: QueryEditorPropertyType.String },
        parameters: v.parameters,
        focus: isNewItem,
      };
    });
    setAggregates(cleaned);

    // Only save valid and complete filters into the query state
    const validExpressions: QueryEditorReduceExpression[] = [];
    for (const operatorExpression of cleaned) {
      const validated = sanitizeAggregate(operatorExpression);
      if (validated) {
        validExpressions.push(validated);
      }
    }

    const newExpression = {
      ...query.expression,
      reduce: { ...query.expression?.reduce, expressions: validExpressions },
    };
    onQueryChange({
      ...query,
      expression: newExpression,
    });
  };

  return (
    <div data-testid="aggregate-section">
      <EditorRow>
        <EditorFieldGroup>
          <EditorField label="Aggregate" optional={true} data-testid={selectors.components.queryEditor.aggregate.field}>
            <EditorList
              items={aggregates}
              onChange={onChange}
              renderItem={makeRenderAggregate(datasource, query, columns, templateVariableOptions)}
            />
          </EditorField>
        </EditorFieldGroup>
      </EditorRow>
    </div>
  );
};

// Making component functions in the render body is not recommended, but it works for now.
// If some problems arise (perhaps with state going missing), consider this to be a potential cause
function makeRenderAggregate(
  datasource: AdxDataSource,
  query: KustoQuery,
  columns: AdxColumnSchema[] | undefined,
  templateVariableOptions: SelectableValue<string>
) {
  function renderAggregate(
    item: Partial<QueryEditorExpression>,
    onChange: (item: QueryEditorExpression) => void,
    onDelete: () => void
  ) {
    return (
      <AggregateItem
        datasource={datasource}
        query={query}
        aggregate={item}
        onChange={onChange}
        onDelete={onDelete}
        columns={columns}
        templateVariableOptions={templateVariableOptions}
      />
    );
  }

  return renderAggregate;
}

export default AggregateSection;
