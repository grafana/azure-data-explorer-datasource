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

export interface Variable {
  text: string;
  value: string;
}

export interface AnnotationItem {
  annotation: any;
  time: number;
  text: string;
  tags: string[];
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

// Text Value type
type TextValueItem = {
  text: string;
  value: string;
};

// Text type (simple)
type TextItem = {
  text: string;
};

export class ResponseParser {
  parseDatabases(results: KustoDatabaseList): DatabaseItem[] {
    const databases: DatabaseItem[] = [];
    if (!results || !results.data || !results.data.Tables || results.data.Tables.length === 0) {
      return databases;
    }

    for (let table of results.data.Tables) {
      for (let row of table.Rows) {
        databases.push({ text: row[5] || row[0], value: row[0] });
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
    debugger;
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
    return { data: data };
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

  parseTableResult(query, columns, rows) {
    const tableResult = {
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

  parseToVariables(results) {
    const variables: TextValueItem[] = [];

    const queryResult = this.parseQueryResult(results);
    console.log('parseToVariables', results, queryResult);
    for (let result of queryResult.data) {
      var row: any;
      for (row of _.flattenDeep(result.rows)) {
        let item: TextValueItem = {
          text: row,
          value: row,
        };
        variables.push(item);
      }
    }

    return variables;
  }

  parseMetricFindQueryResult(refId, results) {
    //if (!results || results.data.length === 0 || results.data.results[refId].meta.rowCount === 0) {
    // return [];
    //}

    debugger;
    const columns = results[refId].result.data.Tables[0].Columns;
    const rows = results[refId].result.data.Tables[0].Rows;
    const textColIndex = this.findColIndex(columns, '__text');
    const valueColIndex = this.findColIndex(columns, '__value');

    if (columns.length === 2 && textColIndex !== -1 && valueColIndex !== -1) {
      return this.transformToKeyValueList(rows, textColIndex, valueColIndex);
    }

    return this.transformToSimpleList(rows);
  }

  transformToKeyValueList(rows, textColIndex, valueColIndex): Variable[] {
    const res: Variable[] = [];

    for (let i = 0; i < rows.length; i++) {
      if (!this.containsKey(res, rows[i][textColIndex])) {
        res.push({
          text: rows[i][textColIndex],
          value: rows[i][valueColIndex],
        });
      }
    }

    return res;
  }

  transformToSimpleList(rows): TextItem[] {
    const res: any[] = [];

    for (var i: number = 0; i < rows.length; i++) {
      for (var j: number = 0; j < rows[i].length; j++) {
        const value: any = rows[i][j];
        if (res.indexOf(value) === -1) {
          res.push(value);
        }
      }
    }

    return _.map(res, value => {
      let item: TextItem = { text: value };
      return item;
    });
  }

  findColIndex(columns, colName) {
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].ColumnName === colName) {
        return i;
      }
    }

    return -1;
  }

  containsKey(res, key) {
    for (let i = 0; i < res.length; i++) {
      debugger;
      if (res[i].text === key) {
        return true;
      }
    }
    return false;
  }

  transformToAnnotations(options: any, result: any) {
    const queryResult = this.parseQueryResult(result);

    const list: AnnotationItem[] = [];

    for (let result of queryResult.data) {
      let timeIndex = -1;
      let textIndex = -1;
      let tagsIndex = -1;

      for (let i = 0; i < result.columns.length; i++) {
        if (timeIndex === -1 && result.columns[i].type === 'datetime') {
          timeIndex = i;
        }

        if (textIndex === -1 && result.columns[i].text.toLowerCase() === 'text') {
          textIndex = i;
        }

        if (tagsIndex === -1 && result.columns[i].text.toLowerCase() === 'tags') {
          tagsIndex = i;
        }
      }

      for (let row of result.rows) {
        list.push({
          annotation: options.annotation,
          time: Math.floor(ResponseParser.dateTimeToEpoch(row[timeIndex])),
          text: row[textIndex] ? row[textIndex].toString() : '',
          tags: row[tagsIndex] ? row[tagsIndex].trim().split(/\s*,\s*/) : [],
        });
      }
    }

    return list;
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

  // TODO(Temp Comment): processQueryResult is for results using the backend plugin
  processQueryResult(res) {
    const data: any[] = [];

    if (!res.data.results) {
      return { data: data };
    }

    for (const key in res.data.results) {
      const queryRes = res.data.results[key];

      if (queryRes.series) {
        for (const series of queryRes.series) {
          data.push({
            target: series.name,
            datapoints: series.points,
            refId: queryRes.refId,
            meta: queryRes.meta,
          });
        }
      }

      if (queryRes.tables) {
        for (const table of queryRes.tables) {
          table.type = 'table';
          table.refId = queryRes.refId;
          table.meta = queryRes.meta;
          data.push(table);
        }
      }
    }

    return { data: data };
  }
}
