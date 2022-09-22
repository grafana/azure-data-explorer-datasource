import React, { useState, useEffect } from 'react';

import { SelectableValue } from '@grafana/data';
import { EditorList } from '@grafana/experimental';

import { AdxDataSource } from '../../../datasource';
import { AdxColumnSchema, KustoQuery } from '../../../types';
import {
  QueryEditorArrayExpression,
  QueryEditorExpression,
  QueryEditorExpressionType,
  QueryEditorOperatorExpression,
} from 'components/LegacyQueryEditor/editor/expressions';
import { QueryEditorPropertyType } from 'schema/types';
import { sanitizeOperator } from './utils/utils';
import FilterItem from './FilterItem';

interface KQLFilterProps {
  index: number;
  query: KustoQuery;
  datasource: AdxDataSource;
  columns?: AdxColumnSchema[];
  templateVariableOptions: SelectableValue<string>;
  onChange: (query: KustoQuery) => void;
}

export interface FilterExpression extends QueryEditorOperatorExpression {
  index: number;
}

const KQLFilter: React.FC<KQLFilterProps> = ({
  index,
  query,
  onChange: onQueryChange,
  datasource,
  columns,
  templateVariableOptions,
}) => {
  // Each expression is a group of several OR statements
  const expressions: FilterExpression[] = (
    query.expression.where.expressions[index] as QueryEditorArrayExpression
  )?.expressions.map((e, i) => ({ ...e, index: i }));
  const [filters, setFilters] = useState<FilterExpression[]>(expressions);

  useEffect(() => {
    if (!filters.length && expressions?.length) {
      setFilters(expressions);
    }
  }, [filters.length, expressions]);

  const onChange = (newItems: Array<Partial<QueryEditorOperatorExpression>>) => {
    // As new (empty object) items come in, with need to make sure they have the correct type
    const cleaned = newItems.map(
      (v, i): FilterExpression => ({
        type: QueryEditorExpressionType.Operator,
        property: v.property ?? { type: QueryEditorPropertyType.String, name: '' },
        operator: v.operator ?? { name: '==', value: '' },
        index: i,
      })
    );
    setFilters(cleaned);

    // Only save valid and complete filters into the query state
    const validExpressions: QueryEditorOperatorExpression[] = [];
    for (const operatorExpression of cleaned) {
      const validated = sanitizeOperator(operatorExpression);
      if (validated) {
        validExpressions.push(validated);
      }
    }

    const where = { ...query.expression.where };
    if (newItems.length) {
      (where.expressions[index] as QueryEditorArrayExpression).expressions = validExpressions;
    } else {
      // The expression is empty, remove it
      const expr = where.expressions;
      expr.splice(index, 1);
      where.expressions = expr;
    }

    const newExpression = { ...query.expression, where };
    onQueryChange({ ...query, expression: newExpression, query: datasource.parseExpression(newExpression, columns) });
  };

  return (
    <EditorList
      items={filters}
      onChange={onChange}
      renderItem={makeRenderFilter(datasource, query, columns, templateVariableOptions, filters.length)}
    />
  );
};

// Making component functions in the render body is not recommended, but it works for now.
// If some problems arise (perhaps with state going missing), consider this to be a potential cause
function makeRenderFilter(
  datasource: AdxDataSource,
  query: KustoQuery,
  columns: AdxColumnSchema[] | undefined,
  templateVariableOptions: SelectableValue<string>,
  filtersLength: number
) {
  function renderFilter(
    item: Partial<QueryEditorExpression>,
    onChange: (item: QueryEditorExpression) => void,
    onDelete: () => void
  ) {
    return (
      <FilterItem
        datasource={datasource}
        query={query}
        filter={item}
        onChange={onChange}
        onDelete={onDelete}
        columns={columns}
        templateVariableOptions={templateVariableOptions}
        filtersLength={filtersLength}
      />
    );
  }

  return renderFilter;
}

export default KQLFilter;
