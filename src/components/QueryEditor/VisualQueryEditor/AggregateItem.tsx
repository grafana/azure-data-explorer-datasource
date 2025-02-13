import React from 'react';

import { SelectableValue } from '@grafana/data';
import { Label, Select } from '@grafana/ui';
import { AccessoryButton, InputGroup } from '@grafana/plugin-ui';

import { AdxDataSource } from '../../../datasource';
import { AdxColumnSchema, KustoQuery } from '../../../types';
import { QueryEditorExpressionType, QueryEditorReduceExpression } from 'types/expressions';
import { columnsToDefinition, toPropertyType, valueToDefinition } from 'schema/mapper';
import { QueryEditorPropertyType } from 'schema/types';
import { range } from 'lodash';

export enum AggregateFunctions {
  Sum = 'sum',
  Avg = 'avg',
  Count = 'count',
  Dcount = 'dcount',
  Max = 'max',
  Min = 'min',
  Percentile = 'percentile',
}

interface AggregateItemProps {
  datasource: AdxDataSource;
  query: KustoQuery;
  aggregate: Partial<QueryEditorReduceExpression>;
  columns: AdxColumnSchema[] | undefined;
  templateVariableOptions: SelectableValue<string>;
  onChange: (item: QueryEditorReduceExpression) => void;
  onDelete: () => void;
}

const AggregateItem: React.FC<AggregateItemProps> = (props) => {
  const { aggregate, onChange, onDelete, columns, templateVariableOptions } = props;

  let columnOptions: Array<SelectableValue<string>> = columns
    ? columnsToDefinition(columns).map((c) => ({ label: c.label, value: c.value }))
    : [];
  columnOptions = columnOptions.concat(templateVariableOptions);

  return (
    <InputGroup>
      <Select
        data-testid="aggregate-item-function"
        aria-label="function"
        autoFocus={aggregate.focus}
        width="auto"
        value={aggregate.reduce?.name ? valueToDefinition(aggregate.reduce?.name) : null}
        options={Object.values(AggregateFunctions).map((f) => ({ label: f, value: f }))}
        allowCustomValue
        onChange={(e) =>
          e.value &&
          onChange({
            reduce: { name: e.value, type: QueryEditorPropertyType.Function },
            property: {
              name: aggregate.property?.name || '',
              type: aggregate.property?.type || QueryEditorPropertyType.String,
            },
            parameters: aggregate.parameters,
            type: QueryEditorExpressionType.Reduce,
          })
        }
      />
      <>
        {aggregate.reduce?.name === AggregateFunctions.Percentile && (
          <Select
            aria-label="percentile"
            options={range(0, 100, 5).map((n) => ({ label: n.toString(), value: n.toString() }))}
            value={aggregate.parameters?.length ? aggregate.parameters[0].value : undefined}
            width="auto"
            allowCustomValue
            onChange={(e) => {
              e.value &&
                onChange({
                  property: {
                    name: aggregate.property?.name || '',
                    type: aggregate.property?.type || QueryEditorPropertyType.String,
                  },
                  reduce: {
                    name: aggregate.reduce?.name || '',
                    type: aggregate.property?.type || QueryEditorPropertyType.Function,
                  },
                  parameters: [
                    {
                      type: QueryEditorExpressionType.FunctionParameter,
                      fieldType: QueryEditorPropertyType.Number,
                      value: e.value,
                      name: 'percentileParam',
                    },
                  ],
                  type: QueryEditorExpressionType.Reduce,
                });
            }}
          />
        )}
      </>
      <>
        {aggregate.reduce?.name !== AggregateFunctions.Count && (
          <>
            <Label style={{ margin: '9px 9px 0 9px' }}>of</Label>
            <Select
              aria-label="column"
              width={'auto'}
              value={aggregate.property?.name ? valueToDefinition(aggregate.property?.name) : null}
              options={columnOptions}
              allowCustomValue
              onChange={(e) =>
                e.value &&
                onChange({
                  property: {
                    name: e.value,
                    type: toPropertyType(
                      columns?.find((c) => c.Name === e.value)?.CslType || QueryEditorPropertyType.String
                    ),
                  },
                  reduce: {
                    name: aggregate.reduce?.name || '',
                    type: aggregate.property?.type || QueryEditorPropertyType.Function,
                  },
                  parameters: aggregate.parameters,
                  type: QueryEditorExpressionType.Reduce,
                })
              }
            />
          </>
        )}
      </>
      <AccessoryButton aria-label="remove" icon="times" variant="secondary" onClick={onDelete} />
    </InputGroup>
  );
};

export default AggregateItem;
