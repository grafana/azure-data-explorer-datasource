import React, { ChangeEvent, PureComponent } from 'react';
import { InlineFormLabel, Select } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { MyDataSourceOptions, MyQuery } from './types';
import { buildQueryEditorSection, QueryEditorFieldDefinition, QueryEditorFieldType } from './editor';

const KustoFromEditorSection = buildQueryEditorSection(builder => builder.build('from'));
const KustoWhereEditorSection = buildQueryEditorSection(builder =>
  builder
    .withOperators(operator => {
      operator('in')
        .supportTypes([QueryEditorFieldType.String, QueryEditorFieldType.Number])
        .withDescription('in (case-sensitive)')
        .multipleValues(true)
        .add();

      operator('in~')
        .supportTypes([QueryEditorFieldType.String, QueryEditorFieldType.Number])
        .withDescription('in (case-insensitive)')
        .multipleValues(true)
        .add();

      operator('!in')
        .supportTypes([QueryEditorFieldType.String, QueryEditorFieldType.Number])
        .withDescription('not in (case-sensitive)')
        .multipleValues(true)
        .add();

      operator('!in~')
        .supportTypes([QueryEditorFieldType.String, QueryEditorFieldType.Number])
        .withDescription('not in (case-insensitive)')
        .multipleValues(true)
        .add();

      operator('==')
        .supportTypes([QueryEditorFieldType.Boolean])
        .withDescription('equal to')
        .booleanValues(true)
        .add();

      operator('!=')
        .supportTypes([QueryEditorFieldType.Boolean])
        .withDescription('not equal to')
        .booleanValues(true)
        .add();
    })
    .build('where')
);

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
        fieldType: QueryEditorFieldType.String,
      },
      {
        value: 'ConferenceSessions',
        fieldType: QueryEditorFieldType.String,
      },
      {
        value: 'StormIsComing',
        fieldType: QueryEditorFieldType.Boolean,
      },
      {
        value: 'Lightning count',
        fieldType: QueryEditorFieldType.Number,
      },
    ];

    return (
      <>
        <KustoFromEditorSection label="From" options={options} onChange={() => {}} />
        <KustoWhereEditorSection label="Where (filter)" options={options} onChange={() => {}} />
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
