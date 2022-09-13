import React, { useState } from 'react';

import { Button, Select } from '@grafana/ui';
import { AccessoryButton, EditorField, EditorFieldGroup, EditorRow, InputGroup } from '@grafana/experimental';

import { AdxColumnSchema, KustoQuery } from '../../../types';
import { QueryEditorExpressionType } from 'components/LegacyQueryEditor/editor/expressions';
import { QueryEditorPropertyType } from 'schema/types';
import { AdxDataSource } from 'datasource';
import { AsyncState } from 'react-use/lib/useAsyncFn';

interface TimeshiftProps {
  datasource: AdxDataSource;
  query: KustoQuery;
  tableSchema: AsyncState<AdxColumnSchema[]>;
  onChange: (query: KustoQuery) => void;
}

const Timeshift: React.FC<TimeshiftProps> = (props) => {
  const { datasource, query, onChange, tableSchema } = props;
  const [displaySelect, setDisplaySelect] = useState(false);
  const onChangeValue = (value?: string) => {
    const newExpression = {
      ...query.expression,
      timeshift: {
        property: {
          name: value || '',
          type: QueryEditorPropertyType.TimeSpan,
        },
        type: QueryEditorExpressionType.Property,
      },
    };
    onChange({
      ...query,
      expression: newExpression,
      query: datasource.parseExpression(newExpression, tableSchema.value),
    });
  };

  return (
    <EditorRow>
      <EditorFieldGroup>
        <EditorField label="Timeshift" optional={true}>
          <InputGroup>
            <Button
              onClick={() => setDisplaySelect(true)}
              variant="secondary"
              size="md"
              icon="plus"
              aria-label="Add"
              type="button"
              hidden={displaySelect}
            />
            <div hidden={!displaySelect}>
              <Select
                width={'auto'}
                aria-label="timeshift"
                allowCustomValue
                options={[
                  {
                    label: 'No timeshift',
                    value: '',
                  },
                  {
                    label: 'Hour before',
                    value: '1h',
                  },
                  {
                    label: 'Day before',
                    value: '1d',
                  },
                  {
                    label: 'Week before',
                    value: '7d',
                  },
                ]}
                value={query.expression.timeshift?.property?.name || ''}
                onChange={(e) => onChangeValue(e.value)}
              />
              <AccessoryButton
                aria-label="remove"
                icon="times"
                variant="secondary"
                onClick={() => {
                  onChangeValue();
                  setDisplaySelect(false);
                }}
              />
            </div>
          </InputGroup>
        </EditorField>
      </EditorFieldGroup>
    </EditorRow>
  );
};

export default Timeshift;
