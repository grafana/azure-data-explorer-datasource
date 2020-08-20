import { KustoQuery, defaultQuery } from 'types';
import { DataQueryRequest } from '@grafana/data';
import { AdxDataSource } from '../datasource';

export class AdxAutoComplete {
  constructor(private datasource: AdxDataSource, private database?: string, private table?: string) {}

  async search(searchTerm?: string, column?: string): Promise<string[]> {
    if (!searchTerm || !column || !this.table || !this.database) {
      return [];
    }

    const queryParts: string[] = [];

    queryParts.push(this.table);
    queryParts.push(`where ${column} contains "${searchTerm}"`);
    queryParts.push(`distinct ${column}`);
    queryParts.push(`order by ${column} asc`);
    queryParts.push(`take 251`);

    const kql = queryParts.join('\n| ');

    const query: KustoQuery = {
      ...defaultQuery,
      refId: `adx-${kql}`,
      database: this.database,
      rawMode: true,
      query: kql,
      resultFormat: 'table',
      querySource: 'autocomplete',
    };

    const response = await this.datasource
      .query({
        targets: [query],
      } as DataQueryRequest<KustoQuery>)
      .toPromise();

    if (!Array.isArray(response?.data) || response.data.length === 0) {
      return [];
    }
    return response.data[0].fields[0].values.toArray();
  }
}
