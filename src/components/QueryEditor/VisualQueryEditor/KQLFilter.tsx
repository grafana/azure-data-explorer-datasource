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
import { Label } from '@grafana/ui';
import { compact, fill, zip } from 'lodash';

interface KQLFilterProps {
  index: number;
  query: KustoQuery;
  datasource: AdxDataSource;
  columns?: AdxColumnSchema[];
  templateVariableOptions: SelectableValue<string>;
  onChange: (query: KustoQuery) => void;
}

export interface FilterItem {
  type: string;
  expression?: QueryEditorOperatorExpression;
}

function expressionsToFilterItems(expressions?: QueryEditorExpression[] | QueryEditorArrayExpression[]): FilterItem[] {
  const f: FilterItem[] = expressions?.map((e) => ({ type: 'expression', expression: e })) || [];
  const c: FilterItem[] = fill(Array(Math.max(f.length - 1, 0)), { type: 'condition' });
  return compact(zip(f, c).flat());
}

function sanitizeFilterItemList(list: FilterItem[]): FilterItem[] {
  const exprs = list.filter((item) => item.type === 'expression').map((item) => item.expression!);
  return expressionsToFilterItems(exprs);
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
  const expressions = (query.expression.where.expressions[index] as QueryEditorArrayExpression)?.expressions;
  const [filters, setFilters] = useState(expressionsToFilterItems(expressions));

  useEffect(() => {
    if (!filters.length && expressions?.length) {
      setFilters(expressionsToFilterItems(expressions));
    }
  }, [filters.length, expressions]);

  const onChange = (newItems: Array<Partial<FilterItem>>) => {
    // As new (empty object) items come in, with need to make sure they have the correct type
    const cleaned: FilterItem[] = sanitizeFilterItemList(
      newItems.map((v, i) => {
        if (!v.type || v.type === 'expression') {
          return {
            type: 'expression',
            expression: {
              type: QueryEditorExpressionType.Operator,
              property: v.expression?.property ?? { type: QueryEditorPropertyType.String, name: '' },
              operator: v.expression?.operator ?? { name: '==', value: '' },
            },
          };
        }
        return { type: 'condition' };
      })
    );
    setFilters(cleaned);

    // Only save valid and complete filters into the query state
    const validExpressions: QueryEditorOperatorExpression[] = [];
    for (const operatorExpression of cleaned.filter((v) => v.expression).map((v) => v.expression!)) {
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
      renderItem={makeRenderFilter(datasource, query, columns, templateVariableOptions)}
    />
  );
};

// Making component functions in the render body is not recommended, but it works for now.
// If some problems arise (perhaps with state going missing), consider this to be a potential cause
function makeRenderFilter(
  datasource: AdxDataSource,
  query: KustoQuery,
  columns: AdxColumnSchema[] | undefined,
  templateVariableOptions: SelectableValue<string>
) {
  function renderFilter(item: Partial<FilterItem>, onChange: (item: FilterItem) => void, onDelete: () => void) {
    if (item.type === 'condition') {
      return <Label style={{ paddingTop: '9px' }}>OR</Label>;
    }
    return (
      <FilterItem
        datasource={datasource}
        query={query}
        filter={item.expression!}
        onChange={onChange}
        onDelete={onDelete}
        columns={columns}
        templateVariableOptions={templateVariableOptions}
      />
    );
  }

  return renderFilter;
}

export default KQLFilter;
