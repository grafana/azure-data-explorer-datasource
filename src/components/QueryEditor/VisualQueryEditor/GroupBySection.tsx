import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { EditorField, EditorFieldGroup, EditorList, EditorRow } from '@grafana/plugin-ui';
import { QueryEditorExpression, QueryEditorExpressionType, QueryEditorGroupByExpression } from 'types/expressions';
import { AdxDataSource } from 'datasource';
import React, { useState, useEffect } from 'react';
import { AdxColumnSchema, AdxDataSourceOptions, KustoQuery } from 'types';
import { QueryEditorPropertyType } from 'schema/types';
import { sanitizeGroupBy } from './utils/utils';
import GroupByItem from './GroupByItem';
import { selectors } from 'test/selectors';

type Props = QueryEditorProps<AdxDataSource, KustoQuery, AdxDataSourceOptions>;

interface GroupBySectionProps extends Props {
  columns: AdxColumnSchema[];
  database: string;
  templateVariableOptions: SelectableValue<string>;
}

const GroupBySection: React.FC<GroupBySectionProps> = ({
  query,
  datasource,
  columns,
  templateVariableOptions,
  onChange: onQueryChange,
}) => {
  const expressions = query.expression?.groupBy?.expressions;
  const [groupBys, setGroupBys] = useState(expressions);
  const [currentTable, setCurrentTable] = useState(query.expression?.from?.property.name);

  useEffect(() => {
    if (!groupBys.length && expressions?.length) {
      setGroupBys(expressions);
    }
  }, [groupBys?.length, expressions]);

  useEffect(() => {
    // New table
    if (currentTable !== query.expression?.from?.property.name) {
      // Reset state
      setGroupBys([]);
      setCurrentTable(query.expression?.from?.property.name);
    }
  }, [currentTable, query.expression?.from?.property.name]);

  const onChange = (newItems: Array<Partial<QueryEditorGroupByExpression>>) => {
    const cleaned = newItems.map((v): QueryEditorGroupByExpression => {
      const isNewItem = Object.keys(v).length === 0;

      return {
        type: QueryEditorExpressionType.GroupBy,
        property: v.property ?? { type: QueryEditorPropertyType.String, name: '' },
        interval: v.interval,
        focus: isNewItem,
      };
    });
    setGroupBys(cleaned);

    // Only save valid and complete filters into the query state
    const validExpressions: QueryEditorGroupByExpression[] = [];
    for (const operatorExpression of cleaned) {
      const validated = sanitizeGroupBy(operatorExpression);
      if (validated) {
        validExpressions.push(validated);
      }
    }

    const newExpression = {
      ...query.expression,
      groupBy: { ...query.expression?.groupBy, expressions: validExpressions },
    };
    onQueryChange({
      ...query,
      expression: newExpression,
    });
  };

  return (
    <>
      <EditorRow>
        <EditorFieldGroup>
          <EditorField label="Group by" optional={true} data-testid={selectors.components.queryEditor.groupBy.field}>
            <EditorList
              items={groupBys}
              onChange={onChange}
              renderItem={makeRenderGroupBy(query, columns, templateVariableOptions)}
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
