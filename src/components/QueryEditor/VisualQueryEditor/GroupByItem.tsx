import { t } from '@grafana/i18n';
import React from 'react';

import { SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';
import { AccessoryButton, InputGroup } from '@grafana/plugin-ui';

import { AdxColumnSchema, KustoQuery } from '../../../types';
import { QueryEditorExpressionType, QueryEditorGroupByExpression } from 'types/expressions';
import { columnsToDefinition, toPropertyType, valueToDefinition } from 'schema/mapper';
import { QueryEditorPropertyType } from 'schema/types';

interface GroupByItemProps {
  query: KustoQuery;
  groupBy: Partial<QueryEditorGroupByExpression>;
  columns: AdxColumnSchema[] | undefined;
  templateVariableOptions: SelectableValue<string>;
  onChange: (item: QueryEditorGroupByExpression) => void;
  onDelete: () => void;
}

const GroupByItem: React.FC<GroupByItemProps> = (props) => {
  const { groupBy, onChange, onDelete, columns, templateVariableOptions } = props;

  let columnOptions: Array<SelectableValue<string>> = columns
    ? columnsToDefinition(columns).map((c) => ({ label: c.label, value: c.value }))
    : [];
  columnOptions = columnOptions.concat(templateVariableOptions);

  return (
    <InputGroup>
      <Select
        aria-label={t('components.group-by-item.aria-label-column', 'Column')}
        width={'auto'}
        autoFocus={groupBy.focus}
        value={groupBy.property?.name ? valueToDefinition(groupBy.property?.name) : null}
        options={columnOptions}
        allowCustomValue
        onChange={(e) => {
          e.value &&
            onChange({
              property: {
                name: e.value,
                type: toPropertyType(
                  columns?.find((c) => c.Name === e.value)?.CslType || QueryEditorPropertyType.String
                ),
              },
              interval: groupBy.interval,
              type: QueryEditorExpressionType.GroupBy,
            });
        }}
      />
      <>
        {groupBy.property?.type === QueryEditorPropertyType.DateTime && (
          <Select
            width={'auto'}
            aria-label={t('components.group-by-item.aria-label-interval', 'Interval')}
            allowCustomValue
            options={[
              { label: t('components.group-by-item.label.auto', 'auto'), value: '$__timeInterval' },
              { label: t('components.group-by-item.label.1-minute', '1 minute'), value: '1m' },
              { label: t('components.group-by-item.label.5-minutes', '5 minutes'), value: '5m' },
              { label: t('components.group-by-item.label.15-minutes', '15 minutes'), value: '15m' },
              { label: t('components.group-by-item.label.30-minutes', '30 minutes'), value: '30m' },
              { label: t('components.group-by-item.label.1-hour', '1 hour'), value: '1h' },
              { label: t('components.group-by-item.label.6-hours', '6 hours'), value: '6h' },
              { label: t('components.group-by-item.label.12-hours', '12 hours'), value: '12h' },
              { label: t('components.group-by-item.label.1-day', '1 day'), value: '1d' },
            ]}
            value={groupBy.interval?.name}
            onChange={(e) => {
              e.value &&
                onChange({
                  interval: {
                    name: e.value,
                    type: QueryEditorPropertyType.Interval,
                  },
                  property: groupBy.property ?? {
                    name: '',
                    type: QueryEditorPropertyType.String,
                  },
                  type: QueryEditorExpressionType.GroupBy,
                });
            }}
          />
        )}
      </>
      <AccessoryButton
        aria-label={t('components.group-by-item.aria-label-remove', 'Remove')}
        icon="times"
        variant="secondary"
        onClick={onDelete}
      />
    </InputGroup>
  );
};

export default GroupByItem;
