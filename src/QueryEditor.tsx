import React, { ChangeEvent, PureComponent } from 'react';
import { InlineFormLabel, Select } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { MyDataSourceOptions, MyQuery } from './types';
import { QueryEditorFieldDefinition, QueryEditorFieldType } from './editor';
import { KustoFromEditorSection, KustoWhereEditorSection } from 'QueryEditorSections';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, queryText: event.target.value });
  };

  onConstantChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, constant: parseFloat(event.target.value) });
    // executes the query
    onRunQuery();
  };

  render() {
    //const query = defaults(this.props.query, defaultQuery);
    const options: QueryEditorFieldDefinition[] = [
      {
        value: 'StormEvents',
        type: QueryEditorFieldType.String,
      },
      {
        value: 'ConferenceSessions',
        type: QueryEditorFieldType.String,
      },
      {
        value: 'StormIsComing',
        type: QueryEditorFieldType.Boolean,
      },
      {
        value: 'Lightning count',
        type: QueryEditorFieldType.Number,
      },
    ];

    return (
      <>
        <KustoFromEditorSection label="From" fields={options} onChange={() => {}} />
        <KustoWhereEditorSection label="Where (filter)" fields={options} onChange={e => console.log('e', e)} />
        <div className="gf-form">
          <InlineFormLabel width={12}>Value columns</InlineFormLabel>
          <Select width={30} onChange={() => {}} value={'StormEvents'} options={options} />
        </div>
        <div className="gf-form">
          <InlineFormLabel width={12}>Group by (summarize)</InlineFormLabel>
          <Select width={30} onChange={() => {}} value={'StormEvents'} options={options} />
        </div>
      </>
    );
  }
}
