import React from 'react';
import { useAsyncFn } from 'react-use';

import { SelectableValue, toOption } from '@grafana/data';
import { AccessoryButton, AutoSizeInput, InputGroup, Select } from '@grafana/ui';

import { AdxDataSource } from '../../../datasource';
import { AdxColumnSchema, KustoQuery } from '../../../types';
import {
  QueryEditorExpressionType,
  QueryEditorOperatorExpression,
} from 'components/LegacyQueryEditor/editor/expressions';
import {
  getOperatorExpressionOptions,
  getOperatorExpressionValue,
  setOperatorExpressionName,
  setOperatorExpressionProperty,
  setOperatorExpressionValue,
} from './utils/utils';
import { isMulti, toOperatorOptions } from './utils/operators';
import { columnsToDefinition, valueToDefinition } from 'schema/mapper';
import { QueryEditorPropertyType } from 'schema/types';

interface FilterItemProps {
  datasource: AdxDataSource;
  query: KustoQuery;
  filter: Partial<QueryEditorOperatorExpression>;
  columns: AdxColumnSchema[] | undefined;
  templateVariableOptions: SelectableValue<string>;
  onChange: (item: QueryEditorOperatorExpression) => void;
  onDelete: () => void;
}

const FilterItem: React.FC<FilterItemProps> = (props) => {
  const { datasource, query, filter, onChange, onDelete, columns, templateVariableOptions } = props;

  const loadValues = async () => {
    if (!filter.property?.name) {
      return [];
    }

    return datasource
      .autoCompleteQuery(
        {
          ...query,
          search: {
            operator: { name: 'isnotempty', value: '' },
            property: { name: filter.property?.name, type: filter.property.type },
            type: QueryEditorExpressionType.Operator,
          },
        },
        columns
      )
      .then((result: string[]) => {
        if (Array.isArray(templateVariableOptions.options) && filter.property?.type === 'string') {
          // When selecting a string, automatically quote template variables to generate a valid syntax
          templateVariableOptions.options = templateVariableOptions.options.map((op: SelectableValue<string>) => {
            return { label: op.value, value: `'${op.value}'` };
          });
        }
        return result.map((r): SelectableValue<string> => ({ label: r, value: r })).concat(templateVariableOptions);
      });
  };

  const [state, loadOptions] = useAsyncFn(loadValues, [query, filter.property]);

  return (
    <InputGroup>
      <Select
        aria-label="column"
        width="auto"
        value={filter.property?.name ? valueToDefinition(filter.property?.name) : null}
        options={columns ? columnsToDefinition(columns) : []}
        allowCustomValue
        onChange={(e) => e.value && onChange(setOperatorExpressionProperty(filter, e.value, e.type))}
      />
      <Select
        aria-label="operator"
        width="auto"
        value={filter.operator?.name && toOption(filter.operator.name)}
        options={toOperatorOptions(filter.property?.type)}
        onChange={({ value }) => value && onChange(setOperatorExpressionName(filter, value))}
      />
      <div hidden={filter.property?.type !== QueryEditorPropertyType.Number}>
        <AutoSizeInput
          aria-label="column number value"
          value={(filter.operator?.value && parseInt(filter.operator.value.toString(), 10)) || 0}
          type="number"
          onCommitChange={(e) => {
            onChange(setOperatorExpressionValue(filter, parseInt(e.currentTarget.value, 10)));
          }}
        />
      </div>
      <div hidden={filter.property?.type === QueryEditorPropertyType.Number}>
        <Select
          aria-label="column value"
          width="auto"
          isLoading={state.loading}
          value={getOperatorExpressionValue(filter.operator?.value)}
          options={getOperatorExpressionOptions(state.value, filter.operator?.value)}
          allowCustomValue
          onOpenMenu={loadOptions}
          onChange={(e: SelectableValue<string> | Array<SelectableValue<string>>) =>
            onChange(setOperatorExpressionValue(filter, e))
          }
          isMulti={isMulti(filter.operator?.name)}
        />
      </div>
      <AccessoryButton aria-label="remove" icon="times" variant="secondary" onClick={onDelete} />
    </InputGroup>
  );
};

export default FilterItem;
