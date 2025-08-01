import React, { useState } from 'react';

import { Button, Select } from '@grafana/ui';
import { AccessoryButton, EditorField, EditorFieldGroup, EditorRow, InputGroup } from '@grafana/plugin-ui';

import { KustoQuery } from '../../../types';
import { QueryEditorExpressionType } from 'types/expressions';
import { QueryEditorPropertyType } from 'schema/types';
import { selectors } from 'test/selectors';

interface TimeshiftProps {
  query: KustoQuery;
  onChange: (query: KustoQuery) => void;
}

const Timeshift: React.FC<TimeshiftProps> = (props) => {
  const { query, onChange } = props;
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
    });
  };

  return (
    <EditorRow>
      <EditorFieldGroup>
        <EditorField label="Timeshift" optional={true} data-testid={selectors.components.queryEditor.timeshift.field}>
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
            <>
              {displaySelect && (
                <>
                  <Select
                    width={'auto'}
                    aria-label="timeshift"
                    autoFocus={displaySelect}
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
                </>
              )}
            </>
          </InputGroup>
        </EditorField>
      </EditorFieldGroup>
    </EditorRow>
  );
};

export default Timeshift;
