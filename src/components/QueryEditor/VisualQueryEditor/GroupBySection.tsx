import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { EditorField, EditorFieldGroup, EditorList, EditorRow } from '@grafana/experimental';
import {
  QueryEditorExpression,
  QueryEditorExpressionType,
  QueryEditorGroupByExpression,
} from 'components/LegacyQueryEditor/editor/expressions';
import { AdxDataSource } from 'datasource';
import React, { useState, useEffect } from 'react';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { AdxColumnSchema, AdxDataSourceOptions, KustoQuery } from 'types';
import { QueryEditorPropertyType } from 'schema/types';
import { sanitizeGroupBy } from './utils/utils';
import GroupByItem from './GroupByItem';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface GroupBySectionProps extends Props {
  tableSchema: AsyncState<AdxColumnSchema[]>;
  database: string;
  templateVariableOptions: SelectableValue<string>;
}

const GroupBySection: React.FC<GroupBySectionProps> = ({
  query,
  datasource,
  tableSchema,
  templateVariableOptions,
  onChange: onQueryChange,
}) => {
  const expressions = query.expression.groupBy.expressions;
  const [groupBys, setGroupBys] = useState(expressions);

  useEffect(() => {
    if (!groupBys.length && expressions?.length) {
      setGroupBys(expressions);
    }
  }, [groupBys.length, expressions]);

  const onChange = (newItems: Array<Partial<QueryEditorGroupByExpression>>) => {
    const cleaned = newItems.map(
      (v): QueryEditorGroupByExpression => ({
        type: QueryEditorExpressionType.GroupBy,
        property: v.property ?? { type: QueryEditorPropertyType.String, name: '' },
        interval: v.interval,
      })
    );
    setGroupBys(cleaned);

    // Only save valid and complete filters into the query state
    const validExpressions: QueryEditorExpression[] = [];
    for (const operatorExpression of cleaned) {
      const validated = sanitizeGroupBy(operatorExpression);
      if (validated) {
        validExpressions.push(validated);
      }
    }

    const newExpression = {
      ...query.expression,
      groupBy: { ...query.expression.groupBy, expressions: validExpressions },
    };
    onQueryChange({
      ...query,
      expression: newExpression,
      query: datasource.parseExpression(newExpression, tableSchema.value),
    });
  };

  return (
    <>
      <EditorRow>
        <EditorFieldGroup>
          <EditorField label="Group by" optional={true}>
            <EditorList
              items={groupBys}
              onChange={onChange}
              renderItem={makeRenderGroupBy(query, tableSchema.value, templateVariableOptions)}
            />
          </EditorField>
        </EditorFieldGroup>
      </EditorRow>
    </>
  );
};

// Making component functions in the render body is not recommended, but it works for now.
// If some problems arise (perhaps with state going missing), consider this to be a potential cause
function makeRenderGroupBy(
  query: KustoQuery,
  columns: AdxColumnSchema[] | undefined,
  templateVariableOptions: SelectableValue<string>
) {
  function renderGroupBy(
    item: Partial<QueryEditorExpression>,
    onChange: (item: QueryEditorExpression) => void,
    onDelete: () => void
  ) {
    return (
      <GroupByItem
        query={query}
        groupBy={item}
        onChange={onChange}
        onDelete={onDelete}
        columns={columns}
        templateVariableOptions={templateVariableOptions}
      />
    );
  }

  return renderGroupBy;
}

export default GroupBySection;
