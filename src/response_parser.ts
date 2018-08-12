import _ from 'lodash';
import moment from 'moment';

export interface DataTarget {
  target: string;
  datapoints: any[];
  refId: string;
  query: any;
}

export interface TableResult {
  columns: TableColumn[];
  rows: any[];
  type: string;
  refId: string;
  query: string;
}

export interface TableColumn {
  text: string;
  type: string;
}

// API interfaces
export interface KustoDatabaseList {
  data: {
    Tables: KustoDatabaseItem[];
  };
}

export interface KustoDatabaseItem {
  TableName: string;
  Columns: any[];
  Rows: any[];
}

export interface KustoSchema {
  Databases: { [key: string]: KustoDatabase };
  Plugins: any[];
}
export interface KustoDatabase {
  Name: string;
  Tables: { [key: string]: KustoTable };
  Functions: { [key: string]: KustoFunction };
}

export interface KustoTable {
  Name: string;
  OrderedColumns: KustoColumn[];
}

export interface KustoColumn {
  Name: string;
  Type: string;
}

export interface KustoFunction {
  Name: string;
  DocString: string;
  Body: string;
  Folder: string;
  FunctionKind: string;
  InputParameters: any[];
  OutputColumns: any[];
}

// Internal interfaces
export interface DatabaseItem {
  text: string;
  value: string;
}

export class ResponseParser {
  parseDatabases(results: KustoDatabaseList): DatabaseItem[] {
    const databases: DatabaseItem[] = [];
    if (!results || !results.data || !results.data.Tables || results.data.Tables.length === 0) {
      return databases;
    }

    for (let table of results.data.Tables) {
      for (let row of table.Rows) {
        databases.push({text: row[5] || row[0], value: row[0]});
      }
    }

    return databases;
  }

  parseSchemaResult(results: any): KustoSchema {
    const schemaJson = results.Tables[0].Rows[0][0];
    return JSON.parse(schemaJson);
  }

  parseQueryResult(results: any) {
    let data: any[] = [];
    let columns: any[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].result.data.Tables.length === 0) {
        continue;
      }
      columns = results[i].result.data.Tables[0].Columns;
      const rows = results[i].result.data.Tables[0].Rows;

      if (results[i].query.resultFormat === 'time_series') {
        data = _.concat(data, this.parseTimeSeriesResult(results[i].query, columns, rows));
      } else {
        data = _.concat(data, this.parseTableResult(results[i].query, columns, rows));
      }
    }

    return {data: data};
  }

  parseTimeSeriesResult(query, columns, rows): DataTarget[] {
    const data: DataTarget[] = [];
    let timeIndex = -1;
    let metricIndex = -1;
    let valueIndex = -1;

    for (let i = 0; i < columns.length; i++) {
      if (timeIndex === -1 && columns[i].ColumnType === 'datetime') {
        timeIndex = i;
      }

      if (metricIndex === -1 && columns[i].ColumnType === 'string') {
        metricIndex = i;
      }

      if (valueIndex === -1 && ['int', 'long', 'real', 'double'].includes(columns[i].ColumnType)) {
        valueIndex = i;
      }
    }

    if (timeIndex === -1) {
      throw new Error('No datetime column found in the result. The Time Series format requires a time column.');
    }
    for (let row of rows) {
      const epoch = ResponseParser.dateTimeToEpoch(row[timeIndex]);
      const metricName = metricIndex > -1 ? row[metricIndex] : columns[valueIndex].name;
      const bucket = ResponseParser.findOrCreateBucket(data, metricName);
      bucket.datapoints.push([row[valueIndex], epoch]);
      bucket.refId = query.refId;
      bucket.query = query.query;
    }
    return data;
  }

  parseTableResult(query, columns, rows): TableResult {
    const tableResult: TableResult = {
      type: 'table',
      columns: _.map(columns, col => {
        return { text: col.ColumnName, type: col.ColumnType };
      }),
      rows: rows,
      refId: query.refId,
      query: query.query,
    };

    return tableResult;
  }

  static findOrCreateBucket(data, target): DataTarget {
    let dataTarget = _.find(data, ['target', target]);
    if (!dataTarget) {
      dataTarget = { target: target, datapoints: [], refId: '', query: '' };
      data.push(dataTarget);
    }

    return dataTarget;
  }

  static dateTimeToEpoch(dateTime) {
    return moment(dateTime).valueOf();
  }
}
