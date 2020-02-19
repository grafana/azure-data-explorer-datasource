import _ from 'lodash';
import { dateTime } from '@grafana/data';

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

export class ResponseParser {
  parseAnnotations(results, options): AnnotationItem[] {
    let annotations: AnnotationItem[] = [];

    if (results.data.hasOwnProperty('results')) {
      Object.keys(results.data.results).forEach(resultKey => {
        const result = results.data.results[resultKey];

        if (result.tables.length > 0) {
          result.tables.forEach(table => {
            table.rows.forEach(row => {
              const entry: AnnotationItem = {
                annotation: options.annotation,
                time: 0,
                text: '',
                tags: [],
              };
              table.columns.forEach((column, idx) => {
                switch (column.text) {
                  case 'StartTime':
                    entry.time = Math.floor(ResponseParser.dateTimeToEpoch(row[idx]));
                    break;
                  case 'Text':
                    entry.text = row[idx];
                    break;
                  case 'Tags':
                    entry.tags = row[idx].trim().split(/\s*,\s*/);
                    break;
                }
              });
              annotations.push(entry);
            });
          });
        }
      });
    } else {
      annotations = this.transformToAnnotations(options, results);
    }

    return annotations;
  }

  parseDatabases(results: KustoDatabaseList): DatabaseItem[] {
    const databases: DatabaseItem[] = [];
    if (!results || !results.data || !results.data.Tables || results.data.Tables.length === 0) {
      return databases;
    }

    for (const table of results.data.Tables) {
      for (const row of table.Rows) {
        databases.push({ text: row[5] || row[0], value: row[0] });
      }
    }

    return databases;
  }

  parseSchemaResult(results: any): KustoSchema {
    const schemaJson = results.Tables[0].Rows[0][0];
    return JSON.parse(schemaJson);
  }

  hasPropertyOfArray(obj: {}, key: string): boolean {
    return typeof obj !== 'undefined' && obj.hasOwnProperty(key) && Array.isArray(obj[key]);
  }

  parseQueryResult(results: any) {
    let ret: any;
    if (this.hasPropertyOfArray(results.data, 'Series')) {
      ret = this.parseTimeSeriesResult(results, results.data.Series[0].Columns, results.data.Series[0].Rows);
    }
    if (this.hasPropertyOfArray(results.data, 'Tables')) {
      ret = this.parseTableResult(results, results.data.Tables[0].Columns, results.data.Tables[0].Rows);
    }

    return { data: [ret] };
  }

  parseTimeSeriesResult(query: any, columns: any, rows: any): DataTarget[] {
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
    for (const row of rows) {
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

  parseToVariables(results): Variable[] {
    let variables: Variable[] = [];
    const queryResult = this.parseQueryResult(results);
    // Issue 7: If we have a __text and __value column as checked above,
    // Use the __value column to match but the __text column to display.
    for (const result of queryResult.data) {
      const textColIndex = this.findColIndex(result, '__text');
      const valueColIndex = this.findColIndex(result, '__value');

      if (textColIndex !== -1 && valueColIndex !== -1) {
        variables = variables.concat(this.transformToKeyValueList(result.rows, textColIndex, valueColIndex));
      } else {
        variables = variables.concat(this.transformToSimpleList(result.rows));
      }
    }

    return variables;
  }

  transformToKeyValueList(rows, textColIndex, valueColIndex): Variable[] {
    const res: Variable[] = [];

    for (let i = 0; i < rows.length; i++) {
      if (!this.containsKey(res, rows[i][textColIndex])) {
        res.push({
          text: rows[i][textColIndex],
          value: rows[i][valueColIndex],
        } as Variable);
      }
    }

    return res;
  }

  transformToSimpleList(rows): Variable[] {
    const res: Variable[] = [];

    for (const row of _.flattenDeep(rows)) {
      res.push({
        text: row,
        value: row,
      } as Variable);
    }

    return res;
  }

  findColIndex(colObj, colName) {
    if ('columns' in colObj) {
      const columns = colObj.columns;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].text === colName) {
          return i;
        }
      }
    }

    return -1;
  }

  containsKey(res, key) {
    for (let i = 0; i < res.length; i++) {
      if (res[i].text === key) {
        return true;
      }
    }
    return false;
  }

  transformToAnnotations(options: any, result: any) {
    const queryResult = this.parseQueryResult(result);
    const list: AnnotationItem[] = [];

    for (const result of queryResult.data) {
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

      for (const row of result.rows) {
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

  static findOrCreateBucket(data: any, target: any): DataTarget {
    let dataTarget = _.find(data, ['target', target]);
    if (!dataTarget) {
      dataTarget = { target: target, datapoints: [], refId: '', query: '' };
      data.push(dataTarget);
    }

    return dataTarget;
  }

  static dateTimeToEpoch(dt: any) {
    return dateTime(dt).valueOf();
  }

  // TODO(Temp Comment): processQueryResult is for results using the backend plugin
  processQueryResult(res) {
    const data: any[] = [];

    if (!res.data.results) {
      return { data: data };
    }

    const valueMap = {};

    for (const key in res.data.results) {
      const queryRes = res.data.results[key];

      if (queryRes.series) {
        for (const series of queryRes.series) {
          let target = series.name;
          try {
            target = JSON.parse(series.name);
          } catch {
            // If the backend does not return a JSON query, mimic it for alias parsing
            target = {
              value: {
                metricname: series.name,
              },
            };
          }

          const val = Object.keys(target)[0];
          // We are just counting the unique values in this response
          // so that later we can use it to determine the best alias name
          valueMap[val] = 0;
          data.push({
            target,
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

    return {
      data: data,
      valueCount: Object.keys(valueMap).length,
    };
  }
}
