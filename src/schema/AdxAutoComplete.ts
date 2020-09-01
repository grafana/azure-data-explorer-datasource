import { KustoQuery, defaultQuery, AdxColumnSchema } from 'types';
import { DataQueryRequest, TimeRange } from '@grafana/data';
import { AdxDataSource } from '../datasource';
import { getTemplateSrv } from '@grafana/runtime';

export class AdxAutoComplete {
  constructor(
    private datasource: AdxDataSource,
    private columnSchema: AdxColumnSchema[] = [],
    private database?: string,
    private table?: string
  ) {}

  async search(searchTerm?: string, column?: string): Promise<string[]> {
    if (!searchTerm || !column || !this.table || !this.database) {
      return [];
    }

    const queryParts: string[] = [];
    const defaultTimeColum = findDefaultTimeColumn(this.columnSchema);

    queryParts.push(this.table);

    if (defaultTimeColum) {
      queryParts.push(this.createTimeFilter(defaultTimeColum));
    }

    queryParts.push(`where ${column} contains "${searchTerm}"`);
    queryParts.push('take 50000');
    queryParts.push(`distinct ${this.castIfDynamic(column, this.columnSchema)}`);
    queryParts.push('take 251');

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
      .query(
        includeTimeRange({
          targets: [query],
        }) as DataQueryRequest<KustoQuery>
      )
      .toPromise();

    if (!Array.isArray(response?.data) || response.data.length === 0) {
      return [];
    }
    return response.data[0].fields[0].values.toArray();
  }

  private createTimeFilter(timeColumn: string): string {
    if (this.isDynamic(timeColumn)) {
      return `where ${this.castIfDynamic(timeColumn, this.columnSchema)} between ($__timeFrom .. $__timeTo)`;
    }
    return `where $__timeFilter(${timeColumn})`;
  }

  private castIfDynamic(column: string, columns: AdxColumnSchema[]): string {
    if (!this.isDynamic(column)) {
      return column;
    }

    const columnSchema = columns.find(c => c.Name === column);
    const columnType = columnSchema?.CslType;

    if (!columnType) {
      return column;
    }

    const parts = column.split('.');

    return parts.reduce((result: string, part, index) => {
      if (!result) {
        return `todynamic(${part})`;
      }

      if (index + 1 === parts.length) {
        return `to${columnType}(${result}.${part})`;
      }

      return `todynamic(${result}.${part})`;
    }, '');
  }

  private isDynamic(column: string): boolean {
    return !!(column && column.indexOf('.') > -1);
  }
}

const findDefaultTimeColumn = (columns: AdxColumnSchema[]): string | undefined => {
  const firstLevelColumn = columns?.find(col => {
    return col.CslType === 'datetime' && col.Name.indexOf('.') === -1;
  });

  if (firstLevelColumn) {
    return firstLevelColumn?.Name;
  }

  const column = columns?.find(col => col.CslType === 'datetime');
  return column?.Name;
};

/**
 * this is a suuuper ugly way of doing this.
 */
const includeTimeRange = (option: any): any => {
  const range = (getTemplateSrv() as any)?.timeRange as TimeRange;

  if (!range) {
    return option;
  }

  return {
    ...option,
    range,
  };
};
