import React from 'react';
import { useAsyncFn } from 'react-use';
import { css } from '@emotion/css';

import { GrafanaTheme2, SelectableValue, toOption } from '@grafana/data';
import { Input, Label, Select, useStyles2 } from '@grafana/ui';
import { AccessoryButton, InputGroup } from '@grafana/plugin-ui';

import { AdxDataSource } from '../../../datasource';
import { AdxColumnSchema, KustoQuery } from '../../../types';
import { QueryEditorExpressionType } from 'types/expressions';
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
import { FilterExpression } from './KQLFilter';

interface FilterItemProps {
  datasource: AdxDataSource;
  query: KustoQuery;
  filter: Partial<FilterExpression>;
  columns: AdxColumnSchema[] | undefined;
  templateVariableOptions: SelectableValue<string>;
  onChange: (item: FilterExpression) => void;
  onDelete: () => void;
  filtersLength: number;
}

const FilterItem: React.FC<FilterItemProps> = (props) => {
  const { datasource, query, filter, onChange, onDelete, columns, templateVariableOptions, filtersLength } = props;
  const styles = useStyles2(getStyles);

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
      .then((result: string[]) =>
        result.map((r): SelectableValue<string> => ({ label: r, value: r })).concat(templateVariableOptions)
      );
  };

  const [state, loadOptions] = useAsyncFn(loadValues, [query, filter.property]);

  const isNumber = filter.property?.type === QueryEditorPropertyType.Number;
  const isDatetime = filter.property?.type === QueryEditorPropertyType.DateTime;
  const isOther = !isNumber && !isDatetime;
  return (
    <InputGroup>
      <Select
        aria-label="column"
        autoFocus={filter.focus}
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
      <div hidden={!isDatetime}>
        <Input
          aria-label="column datetime value"
          value={typeof filter.operator?.value === 'string' ? filter.operator.value : ''}
          onChange={(e) => {
            onChange(setOperatorExpressionValue(filter, e.currentTarget.value));
          }}
        />
      </div>
      <div hidden={!isNumber}>
        <Input
          aria-label="column number value"
          value={typeof filter.operator?.value === 'number' ? filter.operator.value : 0}
          type="number"
          onChange={(e) => {
            onChange(setOperatorExpressionValue(filter, parseInt(e.currentTarget.value, 10)));
          }}
        />
      </div>
      <div hidden={!isOther}>
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
      <>{Number(filter.index) < filtersLength - 1 ? <Label className={styles.orLabel}>OR</Label> : null}</>
    </InputGroup>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    orLabel: css({
      paddingTop: '9px',
      paddingLeft: '14px',
    }),
  };
};

export default FilterItem;
