import { SelectableValue } from '@grafana/data';
import { InlineField, Select } from '@grafana/ui';
import { QueryEditor } from 'components/QueryEditor';
import { AdxDataSource } from 'datasource';
import { needsToBeMigrated, migrateQuery } from 'migrations/query';
import React, { useState } from 'react';
import { useEffectOnce } from 'react-use';
import { AdxQueryType, KustoQuery } from 'types';

type VariableProps = {
    query: KustoQuery;
    onChange: (query: KustoQuery) => void;
    datasource: AdxDataSource;
};

interface VariableOptions<T = string> {
    label: string;
    value: T;
    options?: VariableOptions;
}

const VariableEditor = (props: VariableProps) => {
    const { query, onChange, datasource } = props;
    const VARIABLE_TYPE_OPTIONS = [
        { label: 'Databases', value: AdxQueryType.Databases },
        { label: 'Kusto Query', value: AdxQueryType.KustoQuery },
    ];

    useEffectOnce(() => {
        let processedQuery = query;
        if (needsToBeMigrated(query)) {
            processedQuery = migrateQuery(query);
            onChange(processedQuery);
        }
    });

    const [variableOptionGroup, setVariableOptionGroup] = useState<{ label: string; options: VariableOptions[] }>({
        label: 'Template Variables',
        options: [],
    });
    const queryType = typeof query === 'string' ? '' : query.queryType;

    const onQueryTypeChange = (selectableValue: SelectableValue) => {
        if (selectableValue.value) {
            onChange({
                ...query,
                queryType: selectableValue.value,
            });
        }
    };

    return (
        <>
            <InlineField label="Select query type" labelWidth={20}>
                <Select
                    aria-label="select query type"
                    onChange={onQueryTypeChange}
                    options={VARIABLE_TYPE_OPTIONS}
                    width={25}
                    value={queryType}
                />
            </InlineField>
            {query.queryType === AdxQueryType.KustoQuery && (
                <QueryEditor query={query} onChange={onChange} datasource={datasource} onRunQuery={() => { }} />
            )}
        </>
    );
};

export default VariableEditor;
