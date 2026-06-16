import { t } from '@grafana/i18n';
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
        <EditorField
          label={t('components.timeshift.label-timeshift', 'Timeshift')}
          optional={true}
          data-testid={selectors.components.queryEditor.timeshift.field}
        >
          <InputGroup>
            <Button
              onClick={() => setDisplaySelect(true)}
              variant="secondary"
              size="md"
              icon="plus"
              aria-label={t('components.timeshift.aria-label-add', 'Add')}
              type="button"
              hidden={displaySelect}
            />
            <>
              {displaySelect && (
                <>
                  <Select
                    width={'auto'}
                    aria-label={t('components.timeshift.aria-label-timeshift', 'Timeshift')}
                    autoFocus={displaySelect}
                    allowCustomValue
                    options={[
                      {
                        label: t('components.timeshift.label.no-timeshift', 'No timeshift'),
                        value: '',
                      },
                      {
                        label: t('components.timeshift.label.hour-before', 'Hour before'),
                        value: '1h',
                      },
                      {
                        label: t('components.timeshift.label.day-before', 'Day before'),
                        value: '1d',
                      },
                      {
                        label: t('components.timeshift.label.week-before', 'Week before'),
                        value: '7d',
                      },
                    ]}
                    value={query.expression.timeshift?.property?.name || ''}
                    onChange={(e) => onChangeValue(e.value)}
                  />
                  <AccessoryButton
                    aria-label={t('components.timeshift.aria-label-remove', 'Remove')}
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
